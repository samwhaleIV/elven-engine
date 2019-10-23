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
export default {
    GetColorData: GetColorData,
    ParsePaletteColors: ParsePaletteColors,
    ValidatePalette: ValidatePalette
};
export { GetColorData, ParsePaletteColors, ValidatePalette }
