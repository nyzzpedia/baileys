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
var business_exports = {};
__export(business_exports, {
  parseCatalogNode: () => parseCatalogNode,
  parseCollectionsNode: () => parseCollectionsNode,
  parseOrderDetailsNode: () => parseOrderDetailsNode,
  parseProductNode: () => parseProductNode,
  toProductNode: () => toProductNode,
  uploadingNecessaryImages: () => uploadingNecessaryImages,
  uploadingNecessaryImagesOfProduct: () => uploadingNecessaryImagesOfProduct
});
module.exports = __toCommonJS(business_exports);
var import_boom = require("@hapi/boom");
var import_crypto = require("crypto");
var import_fs = require("fs");
var import_os = require("os");
var import_path = require("path");
var import_WABinary = require("../WABinary/index.js");
var import_generics = require("./generics.js");
var import_messages_media = require("./messages-media.js");
const parseCatalogNode = (node) => {
  const catalogNode = (0, import_WABinary.getBinaryNodeChild)(node, "product_catalog");
  const products = (0, import_WABinary.getBinaryNodeChildren)(catalogNode, "product").map(parseProductNode);
  const paging = (0, import_WABinary.getBinaryNodeChild)(catalogNode, "paging");
  return {
    products,
    nextPageCursor: paging ? (0, import_WABinary.getBinaryNodeChildString)(paging, "after") : void 0
  };
};
const parseCollectionsNode = (node) => {
  const collectionsNode = (0, import_WABinary.getBinaryNodeChild)(node, "collections");
  const collections = (0, import_WABinary.getBinaryNodeChildren)(collectionsNode, "collection").map((collectionNode) => {
    const id = (0, import_WABinary.getBinaryNodeChildString)(collectionNode, "id");
    const name = (0, import_WABinary.getBinaryNodeChildString)(collectionNode, "name");
    const products = (0, import_WABinary.getBinaryNodeChildren)(collectionNode, "product").map(parseProductNode);
    return {
      id,
      name,
      products,
      status: parseStatusInfo(collectionNode)
    };
  });
  return {
    collections
  };
};
const parseOrderDetailsNode = (node) => {
  const orderNode = (0, import_WABinary.getBinaryNodeChild)(node, "order");
  const products = (0, import_WABinary.getBinaryNodeChildren)(orderNode, "product").map((productNode) => {
    const imageNode = (0, import_WABinary.getBinaryNodeChild)(productNode, "image");
    return {
      id: (0, import_WABinary.getBinaryNodeChildString)(productNode, "id"),
      name: (0, import_WABinary.getBinaryNodeChildString)(productNode, "name"),
      imageUrl: (0, import_WABinary.getBinaryNodeChildString)(imageNode, "url"),
      price: +(0, import_WABinary.getBinaryNodeChildString)(productNode, "price"),
      currency: (0, import_WABinary.getBinaryNodeChildString)(productNode, "currency"),
      quantity: +(0, import_WABinary.getBinaryNodeChildString)(productNode, "quantity")
    };
  });
  const priceNode = (0, import_WABinary.getBinaryNodeChild)(orderNode, "price");
  const orderDetails = {
    price: {
      total: +(0, import_WABinary.getBinaryNodeChildString)(priceNode, "total"),
      currency: (0, import_WABinary.getBinaryNodeChildString)(priceNode, "currency")
    },
    products
  };
  return orderDetails;
};
const toProductNode = (productId, product) => {
  const attrs = {};
  const content = [];
  if (typeof productId !== "undefined") {
    content.push({
      tag: "id",
      attrs: {},
      content: Buffer.from(productId)
    });
  }
  if (typeof product.name !== "undefined") {
    content.push({
      tag: "name",
      attrs: {},
      content: Buffer.from(product.name)
    });
  }
  if (typeof product.description !== "undefined") {
    content.push({
      tag: "description",
      attrs: {},
      content: Buffer.from(product.description)
    });
  }
  if (typeof product.retailerId !== "undefined") {
    content.push({
      tag: "retailer_id",
      attrs: {},
      content: Buffer.from(product.retailerId)
    });
  }
  if (product.images.length) {
    content.push({
      tag: "media",
      attrs: {},
      content: product.images.map((img) => {
        if (!("url" in img)) {
          throw new import_boom.Boom("Expected img for product to already be uploaded", { statusCode: 400 });
        }
        return {
          tag: "image",
          attrs: {},
          content: [
            {
              tag: "url",
              attrs: {},
              content: Buffer.from(img.url.toString())
            }
          ]
        };
      })
    });
  }
  if (typeof product.price !== "undefined") {
    content.push({
      tag: "price",
      attrs: {},
      content: Buffer.from(product.price.toString())
    });
  }
  if (typeof product.currency !== "undefined") {
    content.push({
      tag: "currency",
      attrs: {},
      content: Buffer.from(product.currency)
    });
  }
  if ("originCountryCode" in product) {
    if (typeof product.originCountryCode === "undefined") {
      attrs["compliance_category"] = "COUNTRY_ORIGIN_EXEMPT";
    } else {
      content.push({
        tag: "compliance_info",
        attrs: {},
        content: [
          {
            tag: "country_code_origin",
            attrs: {},
            content: Buffer.from(product.originCountryCode)
          }
        ]
      });
    }
  }
  if (typeof product.isHidden !== "undefined") {
    attrs["is_hidden"] = product.isHidden.toString();
  }
  const node = {
    tag: "product",
    attrs,
    content
  };
  return node;
};
const parseProductNode = (productNode) => {
  const isHidden = productNode.attrs.is_hidden === "true";
  const id = (0, import_WABinary.getBinaryNodeChildString)(productNode, "id");
  const mediaNode = (0, import_WABinary.getBinaryNodeChild)(productNode, "media");
  const statusInfoNode = (0, import_WABinary.getBinaryNodeChild)(productNode, "status_info");
  const product = {
    id,
    imageUrls: parseImageUrls(mediaNode),
    reviewStatus: {
      whatsapp: (0, import_WABinary.getBinaryNodeChildString)(statusInfoNode, "status")
    },
    availability: "in stock",
    name: (0, import_WABinary.getBinaryNodeChildString)(productNode, "name"),
    retailerId: (0, import_WABinary.getBinaryNodeChildString)(productNode, "retailer_id"),
    url: (0, import_WABinary.getBinaryNodeChildString)(productNode, "url"),
    description: (0, import_WABinary.getBinaryNodeChildString)(productNode, "description"),
    price: +(0, import_WABinary.getBinaryNodeChildString)(productNode, "price"),
    currency: (0, import_WABinary.getBinaryNodeChildString)(productNode, "currency"),
    isHidden
  };
  return product;
};
async function uploadingNecessaryImagesOfProduct(product, waUploadToServer, timeoutMs = 3e4) {
  product = {
    ...product,
    images: product.images ? await uploadingNecessaryImages(product.images, waUploadToServer, timeoutMs) : product.images
  };
  return product;
}
const uploadingNecessaryImages = async (images, waUploadToServer, timeoutMs = 3e4) => {
  const results = await Promise.all(images.map(async (img) => {
    if ("url" in img) {
      const url = img.url.toString();
      if (url.includes(".whatsapp.net")) {
        return { url };
      }
    }
    const { stream } = await (0, import_messages_media.getStream)(img);
    const hasher = (0, import_crypto.createHash)("sha256");
    const filePath = (0, import_path.join)((0, import_os.tmpdir)(), "img" + (0, import_generics.generateMessageIDV2)());
    const encFileWriteStream = (0, import_fs.createWriteStream)(filePath);
    for await (const block of stream) {
      hasher.update(block);
      encFileWriteStream.write(block);
    }
    const sha = hasher.digest("base64");
    const { directPath } = await waUploadToServer(filePath, {
      mediaType: "product-catalog-image",
      fileEncSha256B64: sha,
      timeoutMs
    });
    await import_fs.promises.unlink(filePath).catch((err) => console.log("Error deleting temp file ", err));
    return { url: (0, import_messages_media.getUrlFromDirectPath)(directPath) };
  }));
  return results;
};
const parseImageUrls = (mediaNode) => {
  const imgNode = (0, import_WABinary.getBinaryNodeChild)(mediaNode, "image");
  return {
    requested: (0, import_WABinary.getBinaryNodeChildString)(imgNode, "request_image_url"),
    original: (0, import_WABinary.getBinaryNodeChildString)(imgNode, "original_image_url")
  };
};
const parseStatusInfo = (mediaNode) => {
  const node = (0, import_WABinary.getBinaryNodeChild)(mediaNode, "status_info");
  return {
    status: (0, import_WABinary.getBinaryNodeChildString)(node, "status"),
    canAppeal: (0, import_WABinary.getBinaryNodeChildString)(node, "can_appeal") === "true"
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  parseCatalogNode,
  parseCollectionsNode,
  parseOrderDetailsNode,
  parseProductNode,
  toProductNode,
  uploadingNecessaryImages,
  uploadingNecessaryImagesOfProduct
});
