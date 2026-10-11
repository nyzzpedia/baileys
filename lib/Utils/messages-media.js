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
var messages_media_exports = {};
__export(messages_media_exports, {
  DEF_MEDIA_HOST: () => DEF_MEDIA_HOST,
  convertToOpusBuffer: () => convertToOpusBuffer,
  decodeMediaRetryNode: () => decodeMediaRetryNode,
  decryptMediaRetryData: () => decryptMediaRetryData,
  downloadContentFromMessage: () => downloadContentFromMessage,
  downloadEncryptedContent: () => downloadEncryptedContent,
  encodeBase64EncodedStringForUpload: () => encodeBase64EncodedStringForUpload,
  encryptMediaRetryRequest: () => encryptMediaRetryRequest,
  encryptedStream: () => encryptedStream,
  extensionForMediaMessage: () => extensionForMediaMessage,
  extractImageThumb: () => extractImageThumb,
  generateProfilePicture: () => generateProfilePicture,
  generateThumbnail: () => generateThumbnail,
  getAudioDuration: () => getAudioDuration,
  getAudioWaveform: () => getAudioWaveform,
  getHttpStream: () => getHttpStream,
  getMediaKeys: () => getMediaKeys,
  getRawMediaUploadData: () => getRawMediaUploadData,
  getStatusCodeForMediaRetry: () => getStatusCodeForMediaRetry,
  getStream: () => getStream,
  getUrlFromDirectPath: () => getUrlFromDirectPath,
  getWAUploadToServer: () => getWAUploadToServer,
  hkdfInfoKey: () => hkdfInfoKey,
  mediaMessageSHA256B64: () => mediaMessageSHA256B64,
  toBuffer: () => toBuffer,
  toReadable: () => toReadable,
  uploadWithNodeHttp: () => uploadWithNodeHttp
});
module.exports = __toCommonJS(messages_media_exports);
var import_boom = require("@hapi/boom");
var import_child_process = require("child_process");
var Crypto = __toESM(require("crypto"));
var import_events = require("events");
var import_fs = require("fs");
var import_os = require("os");
var import_path = require("path");
var import_stream = require("stream");
var import_url = require("url");
var import_WAProto = require("../../WAProto/index.js");
var import_Defaults = require("../Defaults/index.js");
var import_WABinary = require("../WABinary/index.js");
var import_crypto = require("./crypto.js");
var import_generics = require("./generics.js");
const getTmpFilesDirectory = () => (0, import_os.tmpdir)();
const getImageProcessingLibrary = async () => {
  const [jimp, sharp] = await Promise.all([import("jimp").catch(() => {
  }), import("sharp").catch(() => {
  })]);
  if (sharp) {
    return { sharp };
  }
  if (jimp) {
    return { jimp };
  }
  throw new import_boom.Boom("No image processing library available");
};
const hkdfInfoKey = (type) => {
  const hkdfInfo = import_Defaults.MEDIA_HKDF_KEY_MAPPING[type];
  return `WhatsApp ${hkdfInfo} Keys`;
};
const getRawMediaUploadData = async (media, mediaType, logger) => {
  const { stream } = await getStream(media);
  logger?.debug("got stream for raw upload");
  const hasher = Crypto.createHash("sha256");
  const filePath = (0, import_path.join)((0, import_os.tmpdir)(), mediaType + (0, import_generics.generateMessageIDV2)());
  const fileWriteStream = (0, import_fs.createWriteStream)(filePath);
  let fileLength = 0;
  try {
    for await (const data of stream) {
      fileLength += data.length;
      hasher.update(data);
      if (!fileWriteStream.write(data)) {
        await (0, import_events.once)(fileWriteStream, "drain");
      }
    }
    fileWriteStream.end();
    await (0, import_events.once)(fileWriteStream, "finish");
    stream.destroy();
    const fileSha256 = hasher.digest();
    logger?.debug("hashed data for raw upload");
    return {
      filePath,
      fileSha256,
      fileLength
    };
  } catch (error) {
    fileWriteStream.destroy();
    stream.destroy();
    try {
      await import_fs.promises.unlink(filePath);
    } catch {
    }
    throw error;
  }
};
async function getMediaKeys(buffer, mediaType) {
  if (!buffer) {
    throw new import_boom.Boom("Cannot derive from empty media key");
  }
  if (typeof buffer === "string") {
    buffer = Buffer.from(buffer.replace("data:;base64,", ""), "base64");
  }
  const expandedMediaKey = (0, import_crypto.hkdf)(buffer, 112, { info: hkdfInfoKey(mediaType) });
  return {
    iv: expandedMediaKey.slice(0, 16),
    cipherKey: expandedMediaKey.slice(16, 48),
    macKey: expandedMediaKey.slice(48, 80)
  };
}
const extractVideoThumb = async (path, destPath, time, size) => new Promise((resolve, reject) => {
  const cmd = `ffmpeg -ss ${time} -i ${path} -y -vf scale=${size.width}:-1 -vframes 1 -f image2 ${destPath}`;
  (0, import_child_process.exec)(cmd, (err) => {
    if (err) {
      reject(err);
    } else {
      resolve();
    }
  });
});
const extractImageThumb = async (bufferOrFilePath, width = 32) => {
  if (bufferOrFilePath instanceof import_stream.Readable) {
    bufferOrFilePath = await toBuffer(bufferOrFilePath);
  }
  const lib = await getImageProcessingLibrary();
  if ("sharp" in lib && typeof lib.sharp?.default === "function") {
    const img = lib.sharp.default(bufferOrFilePath);
    const dimensions = await img.metadata();
    const buffer = await img.resize(width).jpeg({ quality: 50 }).toBuffer();
    return {
      buffer,
      original: {
        width: dimensions.width,
        height: dimensions.height
      }
    };
  } else if ("jimp" in lib && typeof lib.jimp?.Jimp === "object") {
    const jimp = await lib.jimp.Jimp.read(bufferOrFilePath);
    const dimensions = {
      width: jimp.width,
      height: jimp.height
    };
    const buffer = await jimp.resize({ w: width, mode: lib.jimp.ResizeStrategy.BILINEAR }).getBuffer("image/jpeg", { quality: 50 });
    return {
      buffer,
      original: dimensions
    };
  } else {
    throw new import_boom.Boom("No image processing library available");
  }
};
const encodeBase64EncodedStringForUpload = (b64) => encodeURIComponent(b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/\=+$/, ""));
const generateProfilePicture = async (mediaUpload, dimensions) => {
  let buffer;
  const { width: w = 640, height: h = 640 } = dimensions || {};
  if (Buffer.isBuffer(mediaUpload)) {
    buffer = mediaUpload;
  } else {
    const { stream } = await getStream(mediaUpload);
    buffer = await toBuffer(stream);
  }
  const lib = await getImageProcessingLibrary();
  let img;
  if ("sharp" in lib && typeof lib.sharp?.default === "function") {
    img = lib.sharp.default(buffer).resize(w, h).jpeg({
      quality: 50
    }).toBuffer();
  } else if ("jimp" in lib && typeof lib.jimp?.Jimp === "function") {
    const jimp = await lib.jimp.Jimp.read(buffer);
    const min = Math.min(jimp.width, jimp.height);
    const cropped = jimp.crop({ x: 0, y: 0, w: min, h: min });
    img = cropped.resize({ w, h, mode: lib.jimp.ResizeStrategy.BILINEAR }).getBuffer("image/jpeg", { quality: 50 });
  } else {
    throw new import_boom.Boom("No image processing library available");
  }
  return {
    img: await img
  };
};
const mediaMessageSHA256B64 = (message) => {
  const media = Object.values(message)[0];
  return media?.fileSha256 && Buffer.from(media.fileSha256).toString("base64");
};
async function getAudioDuration(buffer) {
  const musicMetadata = await import("music-metadata");
  let metadata;
  const options = {
    duration: true
  };
  if (Buffer.isBuffer(buffer)) {
    metadata = await musicMetadata.parseBuffer(buffer, void 0, options);
  } else if (typeof buffer === "string") {
    metadata = await musicMetadata.parseFile(buffer, options);
  } else {
    metadata = await musicMetadata.parseStream(buffer, void 0, options);
  }
  return metadata.format.duration;
}
async function getAudioWaveform(buffer, logger) {
  try {
    const { default: decoder } = await import("audio-decode");
    let audioData;
    if (Buffer.isBuffer(buffer)) {
      audioData = buffer;
    } else if (typeof buffer === "string") {
      const rStream = (0, import_fs.createReadStream)(buffer);
      audioData = await toBuffer(rStream);
    } else {
      audioData = await toBuffer(buffer);
    }
    const audioBuffer = await decoder(audioData);
    const rawData = audioBuffer.getChannelData(0);
    const samples = 64;
    const blockSize = Math.floor(rawData.length / samples);
    const filteredData = [];
    for (let i = 0; i < samples; i++) {
      const blockStart = blockSize * i;
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum = sum + Math.abs(rawData[blockStart + j]);
      }
      filteredData.push(sum / blockSize);
    }
    const multiplier = Math.pow(Math.max(...filteredData), -1);
    const normalizedData = filteredData.map((n) => n * multiplier);
    const waveform = new Uint8Array(normalizedData.map((n) => Math.floor(100 * n)));
    return waveform;
  } catch (e) {
    logger?.debug("Failed to generate waveform: " + e);
  }
}
const toReadable = (buffer) => {
  const readable = new import_stream.Readable({ read: () => {
  } });
  readable.push(buffer);
  readable.push(null);
  return readable;
};
const toBuffer = async (stream) => {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  stream.destroy();
  return Buffer.concat(chunks);
};
const getStream = async (item, opts) => {
  if (Buffer.isBuffer(item)) {
    return { stream: toReadable(item), type: "buffer" };
  }
  if ("stream" in item) {
    return { stream: item.stream, type: "readable" };
  }
  const urlStr = item.url.toString();
  if (urlStr.startsWith("data:")) {
    const buffer = Buffer.from(urlStr.split(",")[1], "base64");
    return { stream: toReadable(buffer), type: "buffer" };
  }
  if (urlStr.startsWith("http://") || urlStr.startsWith("https://")) {
    return { stream: await getHttpStream(item.url, opts), type: "remote" };
  }
  return { stream: (0, import_fs.createReadStream)(item.url), type: "file" };
};
async function generateThumbnail(file, mediaType, options) {
  let thumbnail;
  let originalImageDimensions;
  if (mediaType === "image") {
    const { buffer, original } = await extractImageThumb(file);
    thumbnail = buffer.toString("base64");
    if (original.width && original.height) {
      originalImageDimensions = {
        width: original.width,
        height: original.height
      };
    }
  } else if (mediaType === "video") {
    const imgFilename = (0, import_path.join)(getTmpFilesDirectory(), (0, import_generics.generateMessageIDV2)() + ".jpg");
    try {
      await extractVideoThumb(file, imgFilename, "00:00:00", { width: 32, height: 32 });
      const buff = await import_fs.promises.readFile(imgFilename);
      thumbnail = buff.toString("base64");
      await import_fs.promises.unlink(imgFilename);
    } catch (err) {
      options.logger?.debug("could not generate video thumb: " + err);
    }
  }
  return {
    thumbnail,
    originalImageDimensions
  };
}
const getHttpStream = async (url, options = {}) => {
  const response = await fetch(url.toString(), {
    dispatcher: options.dispatcher,
    method: "GET",
    headers: options.headers
  });
  if (!response.ok) {
    throw new import_boom.Boom(`Failed to fetch stream from ${url}`, { statusCode: response.status, data: { url } });
  }
  return response.body instanceof import_stream.Readable ? response.body : import_stream.Readable.fromWeb(response.body);
};
const encryptedStream = async (media, mediaType, { logger, saveOriginalFileIfRequired, opts, isPtt, forceOpus } = {}) => {
  let { stream, type } = await getStream(media, opts);
  let opusConverted = false;
  if (mediaType === "audio" && (isPtt === true || forceOpus === true)) {
    try {
      const rawBuffer = await toBuffer(stream);
      const opusBuffer = await convertToOpusBuffer(rawBuffer, logger);
      stream = toReadable(opusBuffer);
      opusConverted = true;
    } catch {
      ({ stream, type } = await getStream(media, opts));
    }
  }
  logger?.debug("fetched media stream");
  const mediaKey = Crypto.randomBytes(32);
  const { cipherKey, iv, macKey } = await getMediaKeys(mediaKey, mediaType);
  const encFilePath = (0, import_path.join)(getTmpFilesDirectory(), mediaType + (0, import_generics.generateMessageIDV2)() + "-enc");
  const encFileWriteStream = (0, import_fs.createWriteStream)(encFilePath);
  let originalFileStream;
  let originalFilePath;
  if (saveOriginalFileIfRequired) {
    originalFilePath = (0, import_path.join)(getTmpFilesDirectory(), mediaType + (0, import_generics.generateMessageIDV2)() + "-original");
    originalFileStream = (0, import_fs.createWriteStream)(originalFilePath);
  }
  let fileLength = 0;
  const aes = Crypto.createCipheriv("aes-256-cbc", cipherKey, iv);
  const hmac = Crypto.createHmac("sha256", macKey).update(iv);
  const sha256Plain = Crypto.createHash("sha256");
  const sha256Enc = Crypto.createHash("sha256");
  const onChunk = async (buff) => {
    sha256Enc.update(buff);
    hmac.update(buff);
    if (!encFileWriteStream.write(buff)) {
      await (0, import_events.once)(encFileWriteStream, "drain");
    }
  };
  try {
    for await (const data of stream) {
      fileLength += data.length;
      if (type === "remote" && opts?.maxContentLength && fileLength + data.length > opts.maxContentLength) {
        throw new import_boom.Boom(`content length exceeded when encrypting "${type}"`, {
          data: { media, type }
        });
      }
      if (originalFileStream) {
        if (!originalFileStream.write(data)) {
          await (0, import_events.once)(originalFileStream, "drain");
        }
      }
      sha256Plain.update(data);
      await onChunk(aes.update(data));
    }
    await onChunk(aes.final());
    const mac = hmac.digest().slice(0, 10);
    sha256Enc.update(mac);
    const fileSha256 = sha256Plain.digest();
    const fileEncSha256 = sha256Enc.digest();
    encFileWriteStream.write(mac);
    const encFinishPromise = (0, import_events.once)(encFileWriteStream, "finish");
    const originalFinishPromise = originalFileStream ? (0, import_events.once)(originalFileStream, "finish") : Promise.resolve();
    encFileWriteStream.end();
    originalFileStream?.end?.();
    stream.destroy();
    await encFinishPromise;
    await originalFinishPromise;
    logger?.debug("encrypted data successfully");
    return {
      mediaKey,
      originalFilePath,
      encFilePath,
      mac,
      fileEncSha256,
      fileSha256,
      fileLength,
      opusConverted
    };
  } catch (error) {
    encFileWriteStream.destroy();
    originalFileStream?.destroy?.();
    aes.destroy();
    hmac.destroy();
    sha256Plain.destroy();
    sha256Enc.destroy();
    stream.destroy();
    try {
      await import_fs.promises.unlink(encFilePath);
      if (originalFilePath) {
        await import_fs.promises.unlink(originalFilePath);
      }
    } catch (err) {
      logger?.error({ err }, "failed deleting tmp files");
    }
    throw error;
  }
};
const DEF_MEDIA_HOST = "mmg.whatsapp.net";
const AES_CHUNK_SIZE = 16;
const toSmallestChunkSize = (num) => {
  return Math.floor(num / AES_CHUNK_SIZE) * AES_CHUNK_SIZE;
};
const getUrlFromDirectPath = (directPath, host = DEF_MEDIA_HOST) => `https://${host}${directPath}`;
const extractHost = (url) => {
  if (!url)
    return void 0;
  try {
    return new import_url.URL(url).host;
  } catch {
    return void 0;
  }
};
const downloadContentFromMessage = async ({ mediaKey, directPath, url }, type, opts = {}) => {
  const fallbackHost = opts.host ?? extractHost(url);
  const downloadUrl = directPath ? getUrlFromDirectPath(directPath, fallbackHost) : url;
  if (!downloadUrl) {
    throw new import_boom.Boom("No valid media URL or directPath present in message", { statusCode: 400 });
  }
  const keys = await getMediaKeys(mediaKey, type);
  return downloadEncryptedContent(downloadUrl, keys, opts);
};
const downloadEncryptedContent = async (downloadUrl, { cipherKey, iv }, { startByte, endByte, options } = {}) => {
  let bytesFetched = 0;
  let startChunk = 0;
  let firstBlockIsIV = false;
  if (startByte) {
    const chunk = toSmallestChunkSize(startByte || 0);
    if (chunk) {
      startChunk = chunk - AES_CHUNK_SIZE;
      bytesFetched = chunk;
      firstBlockIsIV = true;
    }
  }
  const endChunk = endByte ? toSmallestChunkSize(endByte || 0) + AES_CHUNK_SIZE : void 0;
  const headersInit = options?.headers ? options.headers : void 0;
  const headers = {
    ...headersInit ? Array.isArray(headersInit) ? Object.fromEntries(headersInit) : headersInit : {},
    Origin: import_Defaults.DEFAULT_ORIGIN
  };
  if (startChunk || endChunk) {
    headers.Range = `bytes=${startChunk}-`;
    if (endChunk) {
      headers.Range += endChunk;
    }
  }
  const fetched = await getHttpStream(downloadUrl, {
    ...options || {},
    headers
  });
  let remainingBytes = Buffer.from([]);
  let aes;
  const pushBytes = (bytes, push) => {
    if (startByte || endByte) {
      const start = bytesFetched >= startByte ? void 0 : Math.max(startByte - bytesFetched, 0);
      const end = bytesFetched + bytes.length < endByte ? void 0 : Math.max(endByte - bytesFetched, 0);
      push(bytes.slice(start, end));
      bytesFetched += bytes.length;
    } else {
      push(bytes);
    }
  };
  const output = new import_stream.Transform({
    transform(chunk, _, callback) {
      let data = remainingBytes.length ? Buffer.concat([remainingBytes, chunk]) : chunk;
      const decryptLength = toSmallestChunkSize(data.length);
      remainingBytes = data.slice(decryptLength);
      data = data.slice(0, decryptLength);
      if (!aes) {
        let ivValue = iv;
        if (firstBlockIsIV) {
          ivValue = data.slice(0, AES_CHUNK_SIZE);
          data = data.slice(AES_CHUNK_SIZE);
        }
        aes = Crypto.createDecipheriv("aes-256-cbc", cipherKey, ivValue);
        if (endByte) {
          aes.setAutoPadding(false);
        }
      }
      try {
        pushBytes(aes.update(data), (b) => this.push(b));
        callback();
      } catch (error) {
        callback(error);
      }
    },
    final(callback) {
      try {
        pushBytes(aes.final(), (b) => this.push(b));
        callback();
      } catch (error) {
        callback(error);
      }
    }
  });
  return fetched.pipe(output, { end: true });
};
function extensionForMediaMessage(message) {
  const getExtension = (mimetype) => mimetype.split(";")[0]?.split("/")[1];
  const type = Object.keys(message)[0];
  let extension;
  if (type === "locationMessage" || type === "liveLocationMessage" || type === "productMessage") {
    extension = ".jpeg";
  } else {
    const messageContent = message[type];
    extension = getExtension(messageContent.mimetype);
  }
  return extension;
}
const isNodeRuntime = () => {
  return typeof process !== "undefined" && process.versions?.node !== null && typeof process.versions.bun === "undefined" && typeof globalThis.Deno === "undefined";
};
const uploadWithNodeHttp = async ({ url, filePath, headers, timeoutMs, agent }, redirectCount = 0) => {
  if (redirectCount > 5) {
    throw new Error("Too many redirects");
  }
  const parsedUrl = new import_url.URL(url);
  const httpModule = parsedUrl.protocol === "https:" ? await import("https") : await import("http");
  const fileStats = await import_fs.promises.stat(filePath);
  const fileSize = fileStats.size;
  return new Promise((resolve, reject) => {
    const req = httpModule.request({
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === "https:" ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: "POST",
      headers: {
        ...headers,
        "Content-Length": fileSize
      },
      agent,
      timeout: timeoutMs
    }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        const newUrl = new import_url.URL(res.headers.location, url).toString();
        resolve(uploadWithNodeHttp({
          url: newUrl,
          filePath,
          headers,
          timeoutMs,
          agent
        }, redirectCount + 1));
        return;
      }
      let body = "";
      res.on("data", (chunk) => body += chunk);
      res.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve(void 0);
        }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Upload timeout"));
    });
    const stream = (0, import_fs.createReadStream)(filePath);
    stream.pipe(req);
    stream.on("error", (err) => {
      req.destroy();
      reject(err);
    });
  });
};
const uploadWithFetch = async ({ url, filePath, headers, timeoutMs, agent }) => {
  const nodeStream = (0, import_fs.createReadStream)(filePath);
  const webStream = import_stream.Readable.toWeb(nodeStream);
  const dispatcher = typeof agent?.dispatch === "function" ? agent : void 0;
  const response = await fetch(url, {
    ...dispatcher ? { dispatcher } : {},
    method: "POST",
    body: webStream,
    headers,
    duplex: "half",
    signal: timeoutMs ? AbortSignal.timeout(timeoutMs) : void 0
  });
  try {
    return await response.json();
  } catch {
    return void 0;
  }
};
const uploadMedia = async (params, logger) => {
  if (isNodeRuntime()) {
    logger?.debug("Using Node.js https module for upload (avoids undici buffering bug)");
    return uploadWithNodeHttp(params);
  } else {
    logger?.debug("Using web-standard Fetch API for upload");
    return uploadWithFetch(params);
  }
};
const getWAUploadToServer = ({ customUploadHosts, fetchAgent, logger, options }, refreshMediaConn) => {
  return async (filePath, { mediaType, fileEncSha256B64, timeoutMs }) => {
    let uploadInfo = await refreshMediaConn(false);
    let urls;
    const hosts = [...customUploadHosts, ...uploadInfo.hosts];
    fileEncSha256B64 = encodeBase64EncodedStringForUpload(fileEncSha256B64);
    const customHeaders = (() => {
      const hdrs = options?.headers;
      if (!hdrs)
        return {};
      return Array.isArray(hdrs) ? Object.fromEntries(hdrs) : hdrs;
    })();
    const headers = {
      ...customHeaders,
      "Content-Type": "application/octet-stream",
      Origin: import_Defaults.DEFAULT_ORIGIN
    };
    for (const { hostname } of hosts) {
      logger.debug(`uploading to "${hostname}"`);
      const auth = encodeURIComponent(uploadInfo.auth);
      const url = `https://${hostname}${import_Defaults.MEDIA_PATH_MAP[mediaType]}/${fileEncSha256B64}?auth=${auth}&token=${fileEncSha256B64}`;
      let result;
      try {
        result = await uploadMedia({
          url,
          filePath,
          headers,
          timeoutMs,
          agent: fetchAgent
        }, logger);
        if (result?.url || result?.direct_path) {
          urls = {
            mediaUrl: result.url,
            directPath: result.direct_path,
            meta_hmac: result.meta_hmac,
            fbid: result.fbid,
            ts: result.ts
          };
          break;
        } else {
          uploadInfo = await refreshMediaConn(true);
          throw new Error(`upload failed, reason: ${JSON.stringify(result)}`);
        }
      } catch (error) {
        const isLast = hostname === hosts[uploadInfo.hosts.length - 1]?.hostname;
        logger.warn({ trace: error?.stack, uploadResult: result }, `Error in uploading to ${hostname} ${isLast ? "" : ", retrying..."}`);
      }
    }
    if (!urls) {
      throw new import_boom.Boom("Media upload failed on all hosts", { statusCode: 500 });
    }
    return urls;
  };
};
const getMediaRetryKey = (mediaKey) => {
  return (0, import_crypto.hkdf)(mediaKey, 32, { info: "WhatsApp Media Retry Notification" });
};
const encryptMediaRetryRequest = (key, mediaKey, meId) => {
  const recp = { stanzaId: key.id };
  const recpBuffer = import_WAProto.proto.ServerErrorReceipt.encode(recp).finish();
  const iv = Crypto.randomBytes(12);
  const retryKey = getMediaRetryKey(mediaKey);
  const ciphertext = (0, import_crypto.aesEncryptGCM)(recpBuffer, retryKey, iv, Buffer.from(key.id));
  const req = {
    tag: "receipt",
    attrs: {
      id: key.id,
      to: (0, import_WABinary.jidNormalizedUser)(meId),
      type: "server-error"
    },
    content: [
      // this encrypt node is actually pretty useless
      // the media is returned even without this node
      // keeping it here to maintain parity with WA Web
      {
        tag: "encrypt",
        attrs: {},
        content: [
          { tag: "enc_p", attrs: {}, content: ciphertext },
          { tag: "enc_iv", attrs: {}, content: iv }
        ]
      },
      {
        tag: "rmr",
        attrs: {
          jid: key.remoteJid,
          from_me: (!!key.fromMe).toString(),
          // @ts-ignore
          participant: key.participant || void 0
        }
      }
    ]
  };
  return req;
};
const decodeMediaRetryNode = (node) => {
  const rmrNode = (0, import_WABinary.getBinaryNodeChild)(node, "rmr");
  const event = {
    key: {
      id: node.attrs.id,
      remoteJid: rmrNode.attrs.jid,
      fromMe: rmrNode.attrs.from_me === "true",
      participant: rmrNode.attrs.participant
    }
  };
  const errorNode = (0, import_WABinary.getBinaryNodeChild)(node, "error");
  if (errorNode) {
    const errorCode = +errorNode.attrs.code;
    event.error = new import_boom.Boom(`Failed to re-upload media (${errorCode})`, {
      data: errorNode.attrs,
      statusCode: getStatusCodeForMediaRetry(errorCode)
    });
  } else {
    const encryptedInfoNode = (0, import_WABinary.getBinaryNodeChild)(node, "encrypt");
    const ciphertext = (0, import_WABinary.getBinaryNodeChildBuffer)(encryptedInfoNode, "enc_p");
    const iv = (0, import_WABinary.getBinaryNodeChildBuffer)(encryptedInfoNode, "enc_iv");
    if (ciphertext && iv) {
      event.media = { ciphertext, iv };
    } else {
      event.error = new import_boom.Boom("Failed to re-upload media (missing ciphertext)", { statusCode: 404 });
    }
  }
  return event;
};
const decryptMediaRetryData = ({ ciphertext, iv }, mediaKey, msgId) => {
  const retryKey = getMediaRetryKey(mediaKey);
  const plaintext = (0, import_crypto.aesDecryptGCM)(ciphertext, retryKey, iv, Buffer.from(msgId));
  return import_WAProto.proto.MediaRetryNotification.decode(plaintext);
};
const getStatusCodeForMediaRetry = (code) => MEDIA_RETRY_STATUS_MAP[code];
const MEDIA_RETRY_STATUS_MAP = {
  [import_WAProto.proto.MediaRetryNotification.ResultType.SUCCESS]: 200,
  [import_WAProto.proto.MediaRetryNotification.ResultType.DECRYPTION_ERROR]: 412,
  [import_WAProto.proto.MediaRetryNotification.ResultType.NOT_FOUND]: 404,
  [import_WAProto.proto.MediaRetryNotification.ResultType.GENERAL_ERROR]: 418
};
async function convertToOpusBuffer(buffer, logger) {
  try {
    const { PassThrough } = require("stream");
    const ff = require("fluent-ffmpeg");
    return await new Promise((resolve, reject) => {
      const inStream = new PassThrough();
      const outStream = new PassThrough();
      const chunks = [];
      inStream.end(buffer);
      ff(inStream).noVideo().audioCodec("libopus").format("ogg").audioBitrate("48k").audioChannels(1).audioFrequency(48e3).outputOptions(["-vn", "-b:a 64k", "-ac 2", "-ar 48000", "-map_metadata", "-1", "-application", "voip"]).on("error", reject).on("end", () => resolve(Buffer.concat(chunks))).pipe(outStream, { end: true });
      outStream.on("data", (c) => chunks.push(c));
    });
  } catch (e) {
    logger?.debug(e);
    throw e;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DEF_MEDIA_HOST,
  convertToOpusBuffer,
  decodeMediaRetryNode,
  decryptMediaRetryData,
  downloadContentFromMessage,
  downloadEncryptedContent,
  encodeBase64EncodedStringForUpload,
  encryptMediaRetryRequest,
  encryptedStream,
  extensionForMediaMessage,
  extractImageThumb,
  generateProfilePicture,
  generateThumbnail,
  getAudioDuration,
  getAudioWaveform,
  getHttpStream,
  getMediaKeys,
  getRawMediaUploadData,
  getStatusCodeForMediaRetry,
  getStream,
  getUrlFromDirectPath,
  getWAUploadToServer,
  hkdfInfoKey,
  mediaMessageSHA256B64,
  toBuffer,
  toReadable,
  uploadWithNodeHttp
});
