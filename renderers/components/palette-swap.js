import { GetColorData, ParsePaletteColors, ValidatePalette } from "./image-analysis-base.js";

function GetImageSubstrateData(data) {
    const dataLength = data.length;
    const dataView = new DataView(data.buffer);

    const hashLookup = {};
    const colorLookup = {};
    let hashCount = 0;

    for(let index = 0;index<dataLength;index+=4) {
        const colorData = GetColorData(
            dataView,index
        );
        if(colorData.a === 0) {
            continue;
        }
        let hash;
        if(colorData.hash in hashLookup) {
            hash = hashLookup[colorData.hash];
        } else {
            hash = hashCount;
            hashLookup[colorData.hash] = hash;
            hashCount++;
        }
        if(hash in colorLookup) {
            colorLookup[hash].push(index);
        } else {
            colorLookup[hash] = [index];
        }
    }
    return {
        colorLookup: colorLookup,
        hashCount: hashCount
    }
}
function GetImageSubstrate(data) {
    const imageSubstrateData = GetImageSubstrateData(data);
    const hashCount = imageSubstrateData.hashCount;
    const colorLookup = imageSubstrateData.colorLookup;
    const colorArray = new Array(
        hashCount
    );
    const palette = new Array(
        hashCount
    );
    const dataView = new DataView(
        imageData.data.buffer
    );
    for(let index = 0;index<hashCount;index++) {
        colorArray[index] = colorLookup[index];
        const firstBucketEntryIndex = colorLookup[index][0];
        palette[index] = `rgba(${
            dataView.getUint8(firstBucketEntryIndex)
        },${
            dataView.getUint8(firstBucketEntryIndex+1)
        },${
            dataView.getUint8(firstBucketEntryIndex+2)
        },${
            dataView.getUint8(firstBucketEntryIndex+3) / 255
        })`;
    }
    return {
        defaultPalette: palette,
        colorArray: colorArray
    };
}
function ApplyColorFromSubstrateBucket(dataView,bucket,color) {
    const bucketSize = bucket.length;
    for(let index = 0;index<bucketSize;index++) {
        const dataIndex = bucket[index];
        dataView.setUint32(dataIndex,color);
    }
}
function ApplyColorsBySubstrate(data,substrate,colors) {
    const dataView = new DataView(data.buffer);
    const colorCount = colors.length;
    for(let index = 0;index<colorCount;index++) {
        const substrateBucket = substrate[index];
        ApplyColorFromSubstrateBucket(
            dataView,substrateBucket,colors[index]
        );
    }
}
function GetDefaultPalette(image) {
    const imageWidth = image.width;
    const imageHeight = image.height;
    const testCanvas = new OffscreenCanvas(
        imageWidth,imageHeight
    );
    const testContext = testCanvas.getContext(
        "2d",{alpha:true}
    );
    testContext.drawImage(
        image,0,0,imageWidth,imageWidth,0,0,imageWidth,imageHeight
    );
    const imageData = testContext.getImageData(
        0,0,imageWidth,imageHeight
    );
    return GetImageSubstrate(
        imageData.data
    ).defaultPalette;
}
function PaletteSwap(image) {
    const imageWidth = image.width;
    const imageHeight = image.height;
    const testCanvas = new OffscreenCanvas(
        imageWidth,imageHeight
    );
    const testContext = testCanvas.getContext(
        "2d",{alpha:true}
    );
    testContext.drawImage(
        image,0,0,imageWidth,imageHeight,
        0,0,imageWidth,imageHeight
    );
    const imageData = testContext.getImageData(
        0,0,imageWidth,imageHeight
    );
    const substrateData = GetImageSubstrate(
        imageData.data
    );
    const substrate = substrateData.colorArray;
    const colorCount = substrate.length;

    let defaultPalette = null;
    const swapCache = {};

    const setDefaultPalette = palette => {
        defaultPalette = palette;
        const validatedPalette = ValidatePalette(
            palette,colorCount
        );
        swapCache[validatedPalette.hash] = {
            image: image,
            shouldClose: false
        };
    }
    setDefaultPalette(
        substrateData.defaultPalette
    );
    this.getDefaultPalette = () => {
        return defaultPalette;
    }
    this.getPaletteSize = () => {
        return colorCount;
    }
    this.getSwapped = palette => {
        palette = ValidatePalette(
            palette,colorCount
        );
        if(palette.hash in swapCache) {
            return swapCache[palette.hash].image;
        } else {
            const paletteColors = ParsePaletteColors(
                palette.key
            );
            ApplyColorsBySubstrate(
                imageData.data,substrate,paletteColors
            );
            testContext.putImageData(
                imageData,0,0
            );
            const bitmap = testCanvas.transferToImageBitmap();
            swapCache[palette.hash] = {
                image: bitmap,
                shouldClose: true
            };
            return bitmap;
        }
    }
    this.close = () => Object.entries(swapCache).forEach(entry => {
        const imageKey = entry[0];
        const image = entry[1];
        if(image.shouldClose) {
            image.close();
        }
        delete swapCache[imageKey];
    });
}
export default PaletteSwap;
export { PaletteSwap, GetDefaultPalette }
