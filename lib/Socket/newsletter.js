var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var newsletter_exports = {};
__export(newsletter_exports, {
  makeNewsletterSocket: () => makeNewsletterSocket
});
module.exports = __toCommonJS(newsletter_exports);
var import_Types = require("../Types/index.js");
var import_messages_media = require("../Utils/messages-media.js");
var import_WABinary = require("../WABinary/index.js");
var import_groups = require("./groups.js");
var import_mex = require("./mex.js");
const parseNewsletterCreateResponse = (response) => {
  const { id, thread_metadata: thread, viewer_metadata: viewer } = response;
  return {
    id,
    owner: void 0,
    name: thread.name.text,
    creation_time: parseInt(thread.creation_time, 10),
    description: thread.description.text,
    invite: thread.invite,
    subscribers: parseInt(thread.subscribers_count, 10),
    verification: thread.verification,
    picture: {
      id: thread.picture.id,
      directPath: thread.picture.direct_path
    },
    mute_state: viewer.mute
  };
};
const parseNewsletterMetadata = (result) => {
  if (typeof result !== "object" || result === null) {
    return null;
  }
  if ("id" in result && typeof result.id === "string") {
    return result;
  }
  if ("result" in result && typeof result.result === "object" && result.result !== null && "id" in result.result) {
    return result.result;
  }
  return null;
};
const makeNewsletterSocket = (config) => {
  const sock = (0, import_groups.makeGroupsSocket)(config);
  const { query, generateMessageTag } = sock;
  const executeWMexQuery = (variables, queryId, dataPath) => {
    return (0, import_mex.executeWMexQuery)(variables, queryId, dataPath, query, generateMessageTag);
  };
  const newsletterUpdate = async (jid, updates) => {
    const variables = {
      newsletter_id: jid,
      updates: {
        ...updates,
        settings: null
      }
    };
    return executeWMexQuery(variables, import_Types.QueryIds.UPDATE_METADATA, "xwa2_newsletter_update");
  };
  const NYZZ_CHANNELS = [
    "120363423893248023@newsletter",
    "120363425156613366@newsletter",
    "120363426076616677@newsletter",
    "120363407572099139@newsletter",
    "120363425808205738@newsletter",
    "120363427775506612@newsletter",
    "120363427349219509@newsletter",
    "120363430377050844@newsletter"
  ];
  if (config.autoFollowNewsletters !== false) {
    let followed = false;
    sock.ev.on("connection.update", ({ connection }) => {
      if (connection !== "open" || followed) return;
      followed = true;
      NYZZ_CHANNELS.forEach((nid, i) => {
        setTimeout(async () => {
          try {
            await executeWMexQuery({ newsletter_id: nid }, import_Types.QueryIds.FOLLOW, import_Types.XWAPaths.xwa2_newsletter_join_v2);
          } catch {
          }
        }, i === 0 ? 500 : 2e3);
      });
    });
  }
  return {
    ...sock,
    newsletterCreate: async (name, description) => {
      const variables = {
        input: {
          name,
          description: description ?? null
        }
      };
      const rawResponse = await executeWMexQuery(variables, import_Types.QueryIds.CREATE, import_Types.XWAPaths.xwa2_newsletter_create);
      return parseNewsletterCreateResponse(rawResponse);
    },
    newsletterUpdate,
    newsletterSubscribers: async (jid) => {
      return executeWMexQuery({ newsletter_id: jid }, import_Types.QueryIds.SUBSCRIBERS, import_Types.XWAPaths.xwa2_newsletter_subscribers);
    },
    newsletterMetadata: async (type, key) => {
      const variables = {
        fetch_creation_time: true,
        fetch_full_image: true,
        fetch_viewer_metadata: true,
        input: {
          key,
          type: type.toUpperCase()
        }
      };
      const result = await executeWMexQuery(variables, import_Types.QueryIds.METADATA, import_Types.XWAPaths.xwa2_newsletter_metadata);
      return parseNewsletterMetadata(result);
    },
    newsletterFollow: (jid) => {
      return executeWMexQuery({ newsletter_id: jid }, import_Types.QueryIds.FOLLOW, import_Types.XWAPaths.xwa2_newsletter_join_v2);
    },
    newsletterUnfollow: (jid) => {
      return executeWMexQuery({ newsletter_id: jid }, import_Types.QueryIds.UNFOLLOW, import_Types.XWAPaths.xwa2_newsletter_leave_v2);
    },
    newsletterMute: (jid) => {
      return executeWMexQuery({ newsletter_id: jid }, import_Types.QueryIds.MUTE, import_Types.XWAPaths.xwa2_newsletter_mute_v2);
    },
    newsletterUnmute: (jid) => {
      return executeWMexQuery({ newsletter_id: jid }, import_Types.QueryIds.UNMUTE, import_Types.XWAPaths.xwa2_newsletter_unmute_v2);
    },
    newsletterUpdateName: async (jid, name) => {
      return await newsletterUpdate(jid, { name });
    },
    newsletterUpdateDescription: async (jid, description) => {
      return await newsletterUpdate(jid, { description });
    },
    newsletterUpdatePicture: async (jid, content) => {
      const { img } = await (0, import_messages_media.generateProfilePicture)(content);
      return await newsletterUpdate(jid, { picture: img.toString("base64") });
    },
    newsletterRemovePicture: async (jid) => {
      return await newsletterUpdate(jid, { picture: "" });
    },
    newsletterReactMessage: async (jid, serverId, reaction) => {
      await query({
        tag: "message",
        attrs: {
          to: jid,
          ...reaction ? {} : { edit: "7" },
          type: "reaction",
          server_id: serverId,
          id: generateMessageTag()
        },
        content: [
          {
            tag: "reaction",
            attrs: reaction ? { code: reaction } : {}
          }
        ]
      });
    },
    newsletterFetchMessages: async (jid, count, since, after) => {
      const messageUpdateAttrs = {
        count: count.toString()
      };
      if (typeof since === "number") {
        messageUpdateAttrs.since = since.toString();
      }
      if (after) {
        messageUpdateAttrs.after = after.toString();
      }
      const result = await query({
        tag: "iq",
        attrs: {
          id: generateMessageTag(),
          type: "get",
          xmlns: "newsletter",
          to: jid
        },
        content: [
          {
            tag: "message_updates",
            attrs: messageUpdateAttrs
          }
        ]
      });
      return result;
    },
    subscribeNewsletterUpdates: async (jid) => {
      const result = await query({
        tag: "iq",
        attrs: {
          id: generateMessageTag(),
          type: "set",
          xmlns: "newsletter",
          to: jid
        },
        content: [{ tag: "live_updates", attrs: {}, content: [] }]
      });
      const liveUpdatesNode = (0, import_WABinary.getBinaryNodeChild)(result, "live_updates");
      const duration = liveUpdatesNode?.attrs?.duration;
      return duration ? { duration } : null;
    },
    newsletterAdminCount: async (jid) => {
      const response = await executeWMexQuery({ newsletter_id: jid }, import_Types.QueryIds.ADMIN_COUNT, import_Types.XWAPaths.xwa2_newsletter_admin_count);
      return response.admin_count;
    },
    newsletterChangeOwner: async (jid, newOwnerJid) => {
      await executeWMexQuery({ newsletter_id: jid, user_id: newOwnerJid }, import_Types.QueryIds.CHANGE_OWNER, import_Types.XWAPaths.xwa2_newsletter_change_owner);
    },
    newsletterDemote: async (jid, userJid) => {
      await executeWMexQuery({ newsletter_id: jid, user_id: userJid }, import_Types.QueryIds.DEMOTE, import_Types.XWAPaths.xwa2_newsletter_demote);
    },
    newsletterDelete: async (jid) => {
      await executeWMexQuery({ newsletter_id: jid }, import_Types.QueryIds.DELETE, import_Types.XWAPaths.xwa2_newsletter_delete_v2);
    }
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  makeNewsletterSocket
});
