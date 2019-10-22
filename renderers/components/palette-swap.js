const PALETTE_HASH_SEPERATOR = "_";
const ERROR_PALETTE_MUST_BE_ARRAY = "Palette must be an array!";

function GetColorData(dataView,startIndex) {
    return {
        r: dataView.getUint8(startIndex),
        g: dataView.getUint8(startIndex+1),
        b: dataView.getUint8(startIndex+2),
        a: dataView.getUint8(startIndex+3),
        hash: dataView.getUint32(startIndex)
    }
}
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
function GetImageSubstrate(data,withColorArray,withDefaultPalette) {
    const substrateData = {};
    if(withColorArray || withDefaultPalette) {
        const imageSubstrateData = GetImageSubstrateData(data);
        const hashCount = imageSubstrateData.hashCount;
        const colorLookup = imageSubstrateData.colorLookup;
        if(withColorArray) {
            const colorArray = new Array(hashCount);
            for(let index = 0;index<hashCount;index++) {
                colorArray[index] = colorLookup[index];
            }
            substrateData.colorArray = colorArray;
        }
        if(withDefaultPalette) {
            const palette = new Array(
                hashCount
            );
            const dataView = new DataView(
                imageData.data.buffer
            );
            for(let index = 0;index<hashCount;index++) {
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
            substrateData.defaultPalette = palette;
        }
    }
    return substrateData;
}
function ParsePaletteColors(palette) {
    const paletteSize = palette.length;
    const paletteBuffer = new OffscreenCanvas(
        paletteSize,1
    );
    const bufferContext = paletteBuffer.getContext(
        "2d",{alpha:true}
    );
    for(let index = 0;index<paletteSize;index++) {
        bufferContext.fillStyle = palette[index];
        bufferContext.fillRect(index,0,1,1);
    }
    const colorData = bufferContext.getImageData(
        0,0,paletteSize,1
    );
    const colorDataView = new DataView(
        colorData.data.buffer
    );
    const parsedColors = new Array(
        paletteSize
    );
    for(let index = 0;index<paletteSize;index++) {
        parsedColors[index] = colorDataView.getUint32(index*4);
    }
    return parsedColors;
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
        imageData.data,false,true
    ).defaultPalette;
}
function ValidatePalette(palette,colorCount) {
    if(!Array.isArray(palette)) {
        throw Error(ERROR_PALETTE_MUST_BE_ARRAY);
    }
    if(palette.length !== colorCount) {
        throw Error(`Palette size (${
            palette.length
        }) must be of equal length to that of the source image (${
            colorCount
        })!`);
    }
    return {
        hash: palette.join(
            PALETTE_HASH_SEPERATOR
        ),
        key: palette
    }
}
function PaletteSwap(image,withDefaultPalette) {
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
        imageData.data,true,withDefaultPalette ? true : false
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
        swapCache[validatedPalette.hash] = image;
    }
    if(substrateData.defaultPalette) {
        setDefaultPalette(
            substrateData.defaultPalette
        );
    }
    this.getDefaultPalette = () => {
        if(defaultPalette === null) {
            setDefaultPalette(GetImageSubstrate(
                imageData.data,false,true
            ));
        }
        return defaultPalette;
    }
    this.getSwapped = palette => {
        palette = ValidatePalette(
            palette,colorCount
        );
        if(palette.hash in swapCache) {
            return swapCache[palette.hash];
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
            swapCache[palette.hash] = bitmap;
            return bitmap;
        }
    }
    this.close = () => Object.entries(swapCache).forEach(entry => {
        const imageKey = entry[0];
        const image = entry[1];
        if(typeof image.close === "function") {
            image.close();
        }
        delete swapCache[imageKey];
    });
}
export default PaletteSwap;
export { PaletteSwap, GetDefaultPalette }
