var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var communities_exports = {};
__export(communities_exports, {
  extractCommunityMetadata: () => extractCommunityMetadata,
  makeCommunitiesSocket: () => makeCommunitiesSocket
});
module.exports = __toCommonJS(communities_exports);
var import_WAProto = require("../../WAProto/index.js");
var import_Types = require("../Types/index.js");
var import_Utils = require("../Utils/index.js");
var import_logger = __toESM(require("../Utils/logger.js"));
var import_WABinary = require("../WABinary/index.js");
var import_business = require("./business.js");
const makeCommunitiesSocket = (config) => {
  const sock = (0, import_business.makeBusinessSocket)(config);
  const { authState, ev, query, upsertMessage } = sock;
  const communityQuery = async (jid, type, content) => query({
    tag: "iq",
    attrs: {
      type,
      xmlns: "w:g2",
      to: jid
    },
    content
  });
  const communityMetadata = async (jid) => {
    const result = await communityQuery(jid, "get", [{ tag: "query", attrs: { request: "interactive" } }]);
    return extractCommunityMetadata(result);
  };
  const communityFetchAllParticipating = async () => {
    const result = await query({
      tag: "iq",
      attrs: {
        to: "@g.us",
        xmlns: "w:g2",
        type: "get"
      },
      content: [
        {
          tag: "participating",
          attrs: {},
          content: [
            { tag: "participants", attrs: {} },
            { tag: "description", attrs: {} }
          ]
        }
      ]
    });
    const data = {};
    const communitiesChild = (0, import_WABinary.getBinaryNodeChild)(result, "communities");
    if (communitiesChild) {
      const communities = (0, import_WABinary.getBinaryNodeChildren)(communitiesChild, "community");
      for (const communityNode of communities) {
        const meta = extractCommunityMetadata({
          tag: "result",
          attrs: {},
          content: [communityNode]
        });
        data[meta.id] = meta;
      }
    }
    sock.ev.emit("groups.update", Object.values(data));
    return data;
  };
  async function parseGroupResult(node) {
    import_logger.default.info({ node }, "parseGroupResult");
    const groupNode = (0, import_WABinary.getBinaryNodeChild)(node, "group");
    if (groupNode) {
      try {
        import_logger.default.info({ groupNode }, "groupNode");
        const metadata = await sock.groupMetadata(`${groupNode.attrs.id}@g.us`);
        return metadata ? metadata : Optional.empty();
      } catch (error) {
        console.error("Error parsing group metadata:", error);
        return Optional.empty();
      }
    }
    return Optional.empty();
  }
  const Optional = {
    empty: () => null,
    of: (value) => value !== null ? { value } : null
  };
  sock.ws.on("CB:ib,,dirty", async (node) => {
    const { attrs } = (0, import_WABinary.getBinaryNodeChild)(node, "dirty");
    if (attrs.type !== "communities") {
      return;
    }
    await communityFetchAllParticipating();
    await sock.cleanDirtyBits("groups");
  });
  return {
    ...sock,
    communityMetadata,
    communityCreate: async (subject, body) => {
      const descriptionId = (0, import_Utils.generateMessageID)().substring(0, 12);
      const result = await communityQuery("@g.us", "set", [
        {
          tag: "create",
          attrs: { subject },
          content: [
            {
              tag: "description",
              attrs: { id: descriptionId },
              content: [
                {
                  tag: "body",
                  attrs: {},
                  content: Buffer.from(body || "", "utf-8")
                }
              ]
            },
            {
              tag: "parent",
              attrs: { default_membership_approval_mode: "request_required" }
            },
            {
              tag: "allow_non_admin_sub_group_creation",
              attrs: {}
            },
            {
              tag: "create_general_chat",
              attrs: {}
            }
          ]
        }
      ]);
      return await parseGroupResult(result);
    },
    communityCreateGroup: async (subject, participants, parentCommunityJid) => {
      const key = (0, import_Utils.generateMessageIDV2)();
      const result = await communityQuery("@g.us", "set", [
        {
          tag: "create",
          attrs: {
            subject,
            key
          },
          content: [
            ...participants.map((jid) => ({
              tag: "participant",
              attrs: { jid }
            })),
            { tag: "linked_parent", attrs: { jid: parentCommunityJid } }
          ]
        }
      ]);
      return await parseGroupResult(result);
    },
    communityLeave: async (id) => {
      await communityQuery("@g.us", "set", [
        {
          tag: "leave",
          attrs: {},
          content: [{ tag: "community", attrs: { id } }]
        }
      ]);
    },
    communityUpdateSubject: async (jid, subject) => {
      await communityQuery(jid, "set", [
        {
          tag: "subject",
          attrs: {},
          content: Buffer.from(subject, "utf-8")
        }
      ]);
    },
    communityLinkGroup: async (groupJid, parentCommunityJid) => {
      await communityQuery(parentCommunityJid, "set", [
        {
          tag: "links",
          attrs: {},
          content: [
            {
              tag: "link",
              attrs: { link_type: "sub_group" },
              content: [{ tag: "group", attrs: { jid: groupJid } }]
            }
          ]
        }
      ]);
    },
    communityUnlinkGroup: async (groupJid, parentCommunityJid) => {
      await communityQuery(parentCommunityJid, "set", [
        {
          tag: "unlink",
          attrs: { unlink_type: "sub_group" },
          content: [{ tag: "group", attrs: { jid: groupJid } }]
        }
      ]);
    },
    communityFetchLinkedGroups: async (jid) => {
      let communityJid = jid;
      let isCommunity = false;
      const metadata = await sock.groupMetadata(jid);
      if (metadata.linkedParent) {
        communityJid = metadata.linkedParent;
      } else {
        isCommunity = true;
      }
      const result = await communityQuery(communityJid, "get", [{ tag: "sub_groups", attrs: {} }]);
      const linkedGroupsData = [];
      const subGroupsNode = (0, import_WABinary.getBinaryNodeChild)(result, "sub_groups");
      if (subGroupsNode) {
        const groupNodes = (0, import_WABinary.getBinaryNodeChildren)(subGroupsNode, "group");
        for (const groupNode of groupNodes) {
          linkedGroupsData.push({
            id: groupNode.attrs.id ? (0, import_WABinary.jidEncode)(groupNode.attrs.id, "g.us") : void 0,
            subject: groupNode.attrs.subject || "",
            creation: groupNode.attrs.creation ? Number(groupNode.attrs.creation) : void 0,
            owner: groupNode.attrs.creator ? (0, import_WABinary.jidNormalizedUser)(groupNode.attrs.creator) : void 0,
            size: groupNode.attrs.size ? Number(groupNode.attrs.size) : void 0
          });
        }
      }
      return {
        communityJid,
        isCommunity,
        linkedGroups: linkedGroupsData
      };
    },
    communityRequestParticipantsList: async (jid) => {
      const result = await communityQuery(jid, "get", [
        {
          tag: "membership_approval_requests",
          attrs: {}
        }
      ]);
      const node = (0, import_WABinary.getBinaryNodeChild)(result, "membership_approval_requests");
      const participants = (0, import_WABinary.getBinaryNodeChildren)(node, "membership_approval_request");
      return participants.map((v) => v.attrs);
    },
    communityRequestParticipantsUpdate: async (jid, participants, action) => {
      const result = await communityQuery(jid, "set", [
        {
          tag: "membership_requests_action",
          attrs: {},
          content: [
            {
              tag: action,
              attrs: {},
              content: participants.map((jid2) => ({
                tag: "participant",
                attrs: { jid: jid2 }
              }))
            }
          ]
        }
      ]);
      const node = (0, import_WABinary.getBinaryNodeChild)(result, "membership_requests_action");
      const nodeAction = (0, import_WABinary.getBinaryNodeChild)(node, action);
      const participantsAffected = (0, import_WABinary.getBinaryNodeChildren)(nodeAction, "participant");
      return participantsAffected.map((p) => {
        return { status: p.attrs.error || "200", jid: p.attrs.jid };
      });
    },
    communityParticipantsUpdate: async (jid, participants, action) => {
      const result = await communityQuery(jid, "set", [
        {
          tag: action,
          attrs: action === "remove" ? { linked_groups: "true" } : {},
          content: participants.map((jid2) => ({
            tag: "participant",
            attrs: { jid: jid2 }
          }))
        }
      ]);
      const node = (0, import_WABinary.getBinaryNodeChild)(result, action);
      const participantsAffected = (0, import_WABinary.getBinaryNodeChildren)(node, "participant");
      return participantsAffected.map((p) => {
        return { status: p.attrs.error || "200", jid: p.attrs.jid, content: p };
      });
    },
    communityUpdateDescription: async (jid, description) => {
      const metadata = await communityMetadata(jid);
      const prev = metadata.descId ?? null;
      await communityQuery(jid, "set", [
        {
          tag: "description",
          attrs: {
            ...description ? { id: (0, import_Utils.generateMessageID)() } : { delete: "true" },
            ...prev ? { prev } : {}
          },
          content: description ? [{ tag: "body", attrs: {}, content: Buffer.from(description, "utf-8") }] : void 0
        }
      ]);
    },
    communityInviteCode: async (jid) => {
      const result = await communityQuery(jid, "get", [{ tag: "invite", attrs: {} }]);
      const inviteNode = (0, import_WABinary.getBinaryNodeChild)(result, "invite");
      return inviteNode?.attrs.code;
    },
    communityRevokeInvite: async (jid) => {
      const result = await communityQuery(jid, "set", [{ tag: "invite", attrs: {} }]);
      const inviteNode = (0, import_WABinary.getBinaryNodeChild)(result, "invite");
      return inviteNode?.attrs.code;
    },
    communityAcceptInvite: async (code) => {
      const results = await communityQuery("@g.us", "set", [{ tag: "invite", attrs: { code } }]);
      const result = (0, import_WABinary.getBinaryNodeChild)(results, "community");
      return result?.attrs.jid;
    },
    /**
     * revoke a v4 invite for someone
     * @param communityJid community jid
     * @param invitedJid jid of person you invited
     * @returns true if successful
     */
    communityRevokeInviteV4: async (communityJid, invitedJid) => {
      const result = await communityQuery(communityJid, "set", [
        { tag: "revoke", attrs: {}, content: [{ tag: "participant", attrs: { jid: invitedJid } }] }
      ]);
      return !!result;
    },
    /**
     * accept a CommunityInviteMessage
     * @param key the key of the invite message, or optionally only provide the jid of the person who sent the invite
     * @param inviteMessage the message to accept
     */
    communityAcceptInviteV4: ev.createBufferedFunction(async (key, inviteMessage) => {
      key = typeof key === "string" ? { remoteJid: key } : key;
      const results = await communityQuery(inviteMessage.groupJid, "set", [
        {
          tag: "accept",
          attrs: {
            code: inviteMessage.inviteCode,
            expiration: inviteMessage.inviteExpiration.toString(),
            admin: key.remoteJid
          }
        }
      ]);
      if (key.id) {
        inviteMessage = import_WAProto.proto.Message.GroupInviteMessage.fromObject(inviteMessage);
        inviteMessage.inviteExpiration = 0;
        inviteMessage.inviteCode = "";
        ev.emit("messages.update", [
          {
            key,
            update: {
              message: {
                groupInviteMessage: inviteMessage
              }
            }
          }
        ]);
      }
      await upsertMessage({
        key: {
          remoteJid: inviteMessage.groupJid,
          id: (0, import_Utils.generateMessageIDV2)(sock.user?.id),
          fromMe: false,
          participant: key.remoteJid
          // TODO: investigate if this makes any sense at all
        },
        messageStubType: import_Types.WAMessageStubType.GROUP_PARTICIPANT_ADD,
        messageStubParameters: [JSON.stringify(authState.creds.me)],
        participant: key.remoteJid,
        messageTimestamp: (0, import_Utils.unixTimestampSeconds)()
      }, "notify");
      return results.attrs.from;
    }),
    communityGetInviteInfo: async (code) => {
      const results = await communityQuery("@g.us", "get", [{ tag: "invite", attrs: { code } }]);
      return extractCommunityMetadata(results);
    },
    communityToggleEphemeral: async (jid, ephemeralExpiration) => {
      const content = ephemeralExpiration ? { tag: "ephemeral", attrs: { expiration: ephemeralExpiration.toString() } } : { tag: "not_ephemeral", attrs: {} };
      await communityQuery(jid, "set", [content]);
    },
    communitySettingUpdate: async (jid, setting) => {
      await communityQuery(jid, "set", [{ tag: setting, attrs: {} }]);
    },
    communityMemberAddMode: async (jid, mode) => {
      await communityQuery(jid, "set", [{ tag: "member_add_mode", attrs: {}, content: mode }]);
    },
    communityJoinApprovalMode: async (jid, mode) => {
      await communityQuery(jid, "set", [
        { tag: "membership_approval_mode", attrs: {}, content: [{ tag: "community_join", attrs: { state: mode } }] }
      ]);
    },
    communityFetchAllParticipating
  };
};
const extractCommunityMetadata = (result) => {
  const community = (0, import_WABinary.getBinaryNodeChild)(result, "community");
  const descChild = (0, import_WABinary.getBinaryNodeChild)(community, "description");
  let desc;
  let descId;
  if (descChild) {
    desc = (0, import_WABinary.getBinaryNodeChildString)(descChild, "body");
    descId = descChild.attrs.id;
  }
  const communityId = community.attrs.id?.includes("@") ? community.attrs.id : (0, import_WABinary.jidEncode)(community.attrs.id || "", "g.us");
  const eph = (0, import_WABinary.getBinaryNodeChild)(community, "ephemeral")?.attrs.expiration;
  const memberAddMode = (0, import_WABinary.getBinaryNodeChildString)(community, "member_add_mode") === "all_member_add";
  const metadata = {
    id: communityId,
    subject: community.attrs.subject || "",
    subjectOwner: community.attrs.s_o,
    subjectTime: Number(community.attrs.s_t || 0),
    size: (0, import_WABinary.getBinaryNodeChildren)(community, "participant").length,
    creation: Number(community.attrs.creation || 0),
    owner: community.attrs.creator ? (0, import_WABinary.jidNormalizedUser)(community.attrs.creator) : void 0,
    desc,
    descId,
    linkedParent: (0, import_WABinary.getBinaryNodeChild)(community, "linked_parent")?.attrs.jid || void 0,
    restrict: !!(0, import_WABinary.getBinaryNodeChild)(community, "locked"),
    announce: !!(0, import_WABinary.getBinaryNodeChild)(community, "announcement"),
    isCommunity: !!(0, import_WABinary.getBinaryNodeChild)(community, "parent"),
    isCommunityAnnounce: !!(0, import_WABinary.getBinaryNodeChild)(community, "default_sub_community"),
    joinApprovalMode: !!(0, import_WABinary.getBinaryNodeChild)(community, "membership_approval_mode"),
    memberAddMode,
    participants: (0, import_WABinary.getBinaryNodeChildren)(community, "participant").map(({ attrs }) => {
      return {
        // TODO: IMPLEMENT THE PN/LID FIELDS HERE!!
        id: attrs.jid,
        admin: attrs.type || null
      };
    }),
    ephemeralDuration: eph ? +eph : void 0,
    addressingMode: (0, import_WABinary.getBinaryNodeChildString)(community, "addressing_mode")
  };
  return metadata;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  extractCommunityMetadata,
  makeCommunitiesSocket
});
