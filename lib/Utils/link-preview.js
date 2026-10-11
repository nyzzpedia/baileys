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
var link_preview_exports = {};
__export(link_preview_exports, {
  getUrlInfo: () => getUrlInfo
});
module.exports = __toCommonJS(link_preview_exports);
var import_messages = require("./messages.js");
var import_messages_media = require("./messages-media.js");
const THUMBNAIL_WIDTH_PX = 192;
const getCompressedJpegThumbnail = async (url, { thumbnailWidth, fetchOpts }) => {
  const stream = await (0, import_messages_media.getHttpStream)(url, fetchOpts);
  const result = await (0, import_messages_media.extractImageThumb)(stream, thumbnailWidth);
  return result;
};
const getUrlInfo = async (text, opts = {
  thumbnailWidth: THUMBNAIL_WIDTH_PX,
  fetchOpts: { timeout: 3e3 }
}) => {
  try {
    let retries = 0;
    const maxRetry = 5;
    const { getLinkPreview } = await import("link-preview-js");
    let previewLink = text;
    if (!text.startsWith("https://") && !text.startsWith("http://")) {
      previewLink = "https://" + previewLink;
    }
    const info = await getLinkPreview(previewLink, {
      ...opts.fetchOpts,
      followRedirects: "follow",
      handleRedirects: (baseURL, forwardedURL) => {
        const urlObj = new URL(baseURL);
        const forwardedURLObj = new URL(forwardedURL);
        if (retries >= maxRetry) {
          return false;
        }
        if (forwardedURLObj.hostname === urlObj.hostname || forwardedURLObj.hostname === "www." + urlObj.hostname || "www." + forwardedURLObj.hostname === urlObj.hostname) {
          retries += 1;
          return true;
        } else {
          return false;
        }
      },
      headers: opts.fetchOpts?.headers
    });
    if (info && "title" in info && info.title) {
      const [image] = info.images;
      const urlInfo = {
        "canonical-url": info.url,
        "matched-text": text,
        title: info.title,
        description: info.description,
        originalThumbnailUrl: image
      };
      if (opts.uploadImage) {
        const { imageMessage } = await (0, import_messages.prepareWAMessageMedia)({ image: { url: image } }, {
          upload: opts.uploadImage,
          mediaTypeOverride: "thumbnail-link",
          options: opts.fetchOpts
        });
        urlInfo.jpegThumbnail = imageMessage?.jpegThumbnail ? Buffer.from(imageMessage.jpegThumbnail) : void 0;
        urlInfo.highQualityThumbnail = imageMessage || void 0;
      } else {
        try {
          urlInfo.jpegThumbnail = image ? (await getCompressedJpegThumbnail(image, opts)).buffer : void 0;
        } catch (error) {
          opts.logger?.debug({ err: error.stack, url: previewLink }, "error in generating thumbnail");
        }
      }
      return urlInfo;
    }
  } catch (error) {
    if (!error.message.includes("receive a valid")) {
      throw error;
    }
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getUrlInfo
});
