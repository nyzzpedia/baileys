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
var groups_exports = {};
__export(groups_exports, {
  extractGroupMetadata: () => extractGroupMetadata,
  makeGroupsSocket: () => makeGroupsSocket
});
module.exports = __toCommonJS(groups_exports);
var import_boom = require("@hapi/boom");
var import_WAProto = require("../../WAProto/index.js");
var import_Types = require("../Types/index.js");
var import_Utils = require("../Utils/index.js");
var import_WABinary = require("../WABinary/index.js");
var import_chats = require("./chats.js");
const makeGroupsSocket = (config) => {
  const sock = (0, import_chats.makeChatsSocket)(config);
  const { authState, ev, query, upsertMessage } = sock;
  const groupQuery = async (jid, type, content) => query({
    tag: "iq",
    attrs: {
      type,
      xmlns: "w:g2",
      to: jid
    },
    content
  });
  const groupMetadata = async (jid) => {
    const result = await groupQuery(jid, "get", [{ tag: "query", attrs: { request: "interactive" } }]);
    return extractGroupMetadata(result);
  };
  const groupFetchAllParticipating = async () => {
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
    const groupsChild = (0, import_WABinary.getBinaryNodeChild)(result, "groups");
    if (groupsChild) {
      const groups = (0, import_WABinary.getBinaryNodeChildren)(groupsChild, "group");
      for (const groupNode of groups) {
        const meta = extractGroupMetadata({
          tag: "result",
          attrs: {},
          content: [groupNode]
        });
        data[meta.id] = meta;
      }
    }
    sock.ev.emit("groups.update", Object.values(data));
    return data;
  };
  sock.ws.on("CB:ib,,dirty", async (node) => {
    const { attrs } = (0, import_WABinary.getBinaryNodeChild)(node, "dirty");
    if (attrs.type !== "groups") {
      return;
    }
    await groupFetchAllParticipating();
    await sock.cleanDirtyBits("groups");
  });
  return {
    ...sock,
    groupMetadata,
    groupCreate: async (subject, participants) => {
      const key = (0, import_Utils.generateMessageIDV2)();
      const result = await groupQuery("@g.us", "set", [
        {
          tag: "create",
          attrs: {
            subject,
            key
          },
          content: participants.map((jid) => ({
            tag: "participant",
            attrs: { jid }
          }))
        }
      ]);
      return extractGroupMetadata(result);
    },
    groupLeave: async (id) => {
      await groupQuery("@g.us", "set", [
        {
          tag: "leave",
          attrs: {},
          content: [{ tag: "group", attrs: { id } }]
        }
      ]);
    },
    groupUpdateSubject: async (jid, subject) => {
      await groupQuery(jid, "set", [
        {
          tag: "subject",
          attrs: {},
          content: Buffer.from(subject, "utf-8")
        }
      ]);
    },
    groupRequestParticipantsList: async (jid) => {
      const result = await groupQuery(jid, "get", [
        {
          tag: "membership_approval_requests",
          attrs: {}
        }
      ]);
      const node = (0, import_WABinary.getBinaryNodeChild)(result, "membership_approval_requests");
      const participants = (0, import_WABinary.getBinaryNodeChildren)(node, "membership_approval_request");
      return participants.map((v) => v.attrs);
    },
    groupRequestParticipantsUpdate: async (jid, participants, action) => {
      const result = await groupQuery(jid, "set", [
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
    groupParticipantsUpdate: async (jid, participants, action) => {
      const result = await groupQuery(jid, "set", [
        {
          tag: action,
          attrs: {},
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
    groupUpdateDescription: async (jid, description) => {
      const metadata = await groupMetadata(jid);
      const prev = metadata.descId ?? null;
      await groupQuery(jid, "set", [
        {
          tag: "description",
          attrs: {
            ...description ? { id: (0, import_Utils.generateMessageIDV2)() } : { delete: "true" },
            ...prev ? { prev } : {}
          },
          content: description ? [{ tag: "body", attrs: {}, content: Buffer.from(description, "utf-8") }] : void 0
        }
      ]);
    },
    groupInviteCode: async (jid) => {
      const result = await groupQuery(jid, "get", [{ tag: "invite", attrs: {} }]);
      const inviteNode = (0, import_WABinary.getBinaryNodeChild)(result, "invite");
      return inviteNode?.attrs.code;
    },
    groupRevokeInvite: async (jid) => {
      const result = await groupQuery(jid, "set", [{ tag: "invite", attrs: {} }]);
      const inviteNode = (0, import_WABinary.getBinaryNodeChild)(result, "invite");
      return inviteNode?.attrs.code;
    },
    groupAcceptInvite: async (code) => {
      const results = await groupQuery("@g.us", "set", [{ tag: "invite", attrs: { code } }]);
      const result = (0, import_WABinary.getBinaryNodeChild)(results, "group");
      return result?.attrs.jid;
    },
    /**
     * revoke a v4 invite for someone
     * @param groupJid group jid
     * @param invitedJid jid of person you invited
     * @returns true if successful
     */
    groupRevokeInviteV4: async (groupJid, invitedJid) => {
      const result = await groupQuery(groupJid, "set", [
        { tag: "revoke", attrs: {}, content: [{ tag: "participant", attrs: { jid: invitedJid } }] }
      ]);
      return !!result;
    },
    /**
     * accept a GroupInviteMessage
     * @param key the key of the invite message, or optionally only provide the jid of the person who sent the invite
     * @param inviteMessage the message to accept
     */
    groupAcceptInviteV4: ev.createBufferedFunction(async (key, inviteMessage) => {
      key = typeof key === "string" ? { remoteJid: key } : key;
      const results = await groupQuery(inviteMessage.groupJid, "set", [
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
        },
        messageStubType: import_Types.WAMessageStubType.GROUP_PARTICIPANT_ADD,
        messageStubParameters: [JSON.stringify(authState.creds.me)],
        participant: key.remoteJid,
        messageTimestamp: (0, import_Utils.unixTimestampSeconds)()
      }, "notify");
      return results.attrs.from;
    }),
    groupGetInviteInfo: async (code) => {
      const results = await groupQuery("@g.us", "get", [{ tag: "invite", attrs: { code } }]);
      return extractGroupMetadata(results);
    },
    groupToggleEphemeral: async (jid, ephemeralExpiration) => {
      const content = ephemeralExpiration ? { tag: "ephemeral", attrs: { expiration: ephemeralExpiration.toString() } } : { tag: "not_ephemeral", attrs: {} };
      await groupQuery(jid, "set", [content]);
    },
    groupSettingUpdate: async (jid, setting) => {
      await groupQuery(jid, "set", [{ tag: setting, attrs: {} }]);
    },
    groupMemberAddMode: async (jid, mode) => {
      await groupQuery(jid, "set", [{ tag: "member_add_mode", attrs: {}, content: mode }]);
    },
    groupJoinApprovalMode: async (jid, mode) => {
      await groupQuery(jid, "set", [
        { tag: "membership_approval_mode", attrs: {}, content: [{ tag: "group_join", attrs: { state: mode } }] }
      ]);
    },
    groupFetchAllParticipating
  };
};
const extractGroupMetadata = (result) => {
  const group = (0, import_WABinary.getBinaryNodeChild)(result, "group");
  if (!group) {
    const errorNode = (0, import_WABinary.getBinaryNodeChild)(result, "error");
    if (errorNode) {
      const code = errorNode.attrs.code ? +errorNode.attrs.code : 500;
      const text = errorNode.attrs.text || "group metadata query failed";
      throw new import_boom.Boom(text, { statusCode: code, data: errorNode });
    }
    throw new import_boom.Boom("Invalid group metadata response: missing <group> node", { data: result });
  }
  if (!group.attrs.id) {
    throw new import_boom.Boom("Invalid group metadata response: missing group id", { data: group });
  }
  const descChild = (0, import_WABinary.getBinaryNodeChild)(group, "description");
  let desc;
  let descId;
  let descOwner;
  let descOwnerPn;
  let descOwnerUsername;
  let descTime;
  if (descChild) {
    desc = (0, import_WABinary.getBinaryNodeChildString)(descChild, "body");
    descOwner = descChild.attrs.participant ? (0, import_WABinary.jidNormalizedUser)(descChild.attrs.participant) : void 0;
    descOwnerPn = descChild.attrs.participant_pn ? (0, import_WABinary.jidNormalizedUser)(descChild.attrs.participant_pn) : void 0;
    descOwnerUsername = descChild.attrs.participant_username || void 0;
    descTime = +descChild.attrs.t;
    descId = descChild.attrs.id;
  }
  const groupId = group.attrs.id.includes("@") ? group.attrs.id : (0, import_WABinary.jidEncode)(group.attrs.id, "g.us");
  const eph = (0, import_WABinary.getBinaryNodeChild)(group, "ephemeral")?.attrs.expiration;
  const memberAddMode = (0, import_WABinary.getBinaryNodeChildString)(group, "member_add_mode") === "all_member_add";
  const metadata = {
    id: groupId,
    notify: group.attrs.notify,
    addressingMode: group.attrs.addressing_mode === "lid" ? import_Types.WAMessageAddressingMode.LID : import_Types.WAMessageAddressingMode.PN,
    subject: group.attrs.subject,
    subjectOwner: group.attrs.s_o,
    subjectOwnerPn: group.attrs.s_o_pn,
    subjectOwnerUsername: group.attrs.s_o_username,
    subjectTime: +group.attrs.s_t,
    size: group.attrs.size ? +group.attrs.size : (0, import_WABinary.getBinaryNodeChildren)(group, "participant").length,
    creation: +group.attrs.creation,
    owner: group.attrs.creator ? (0, import_WABinary.jidNormalizedUser)(group.attrs.creator) : void 0,
    ownerPn: group.attrs.creator_pn ? (0, import_WABinary.jidNormalizedUser)(group.attrs.creator_pn) : void 0,
    ownerUsername: group.attrs.creator_username || void 0,
    owner_country_code: group.attrs.creator_country_code,
    desc,
    descId,
    descOwner,
    descOwnerPn,
    descOwnerUsername,
    descTime,
    linkedParent: (0, import_WABinary.getBinaryNodeChild)(group, "linked_parent")?.attrs.jid || void 0,
    restrict: !!(0, import_WABinary.getBinaryNodeChild)(group, "locked"),
    announce: !!(0, import_WABinary.getBinaryNodeChild)(group, "announcement"),
    isCommunity: !!(0, import_WABinary.getBinaryNodeChild)(group, "parent"),
    isCommunityAnnounce: !!(0, import_WABinary.getBinaryNodeChild)(group, "default_sub_group"),
    joinApprovalMode: !!(0, import_WABinary.getBinaryNodeChild)(group, "membership_approval_mode"),
    memberAddMode,
    participants: (0, import_WABinary.getBinaryNodeChildren)(group, "participant").map(({ attrs }) => {
      return {
        id: attrs.jid,
        phoneNumber: (0, import_WABinary.isLidUser)(attrs.jid) && (0, import_WABinary.isPnUser)(attrs.phone_number) ? attrs.phone_number : void 0,
        lid: (0, import_WABinary.isPnUser)(attrs.jid) && (0, import_WABinary.isLidUser)(attrs.lid) ? attrs.lid : void 0,
        username: attrs.participant_username || attrs.username || void 0,
        admin: attrs.type || null
      };
    }),
    ephemeralDuration: eph ? +eph : void 0
  };
  return metadata;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  extractGroupMetadata,
  makeGroupsSocket
});
