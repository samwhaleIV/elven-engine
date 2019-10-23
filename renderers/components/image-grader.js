import { GetColorData, ParsePaletteColors, ValidatePalette } from "./image-analysis-base.js";

const CHANNEL_COUNT = 6;
function GetEmptyChannels() {
    const channels = new Array(CHANNEL_COUNT);
    for(let index = 0;index<CHANNEL_COUNT;index++) {
        channels[index] = new Array();
    }
    return channels;
}
function IsFullyTransparent(color) {
    return color.a === 0;
}
function IsGrayScale(color) {
    return color.r === color.b && color.r === color.g;
}
function IsRedChannel(color) {
    return color.r && !color.g && !color.b;
}
function IsGreenChannel(color) {
    return color.g && !color.r && !color.b;
}
function IsBlueChannel(color) {
    return color.b && !color.r && !color.g;
}
function IsYellowChannel(color) {
    return color.r && color.r === color.g && !color.b;
}
function IsCyanChannel(color) {
    return color.b && color.b === color.g && !color.r;
}
function IsMagentaChannel(color) {
    return color.r && color.r === color.b && !color.g;
}
const TRY_GET_SHADE = [
    IsRedChannel,IsGreenChannel,IsBlueChannel,
    IsYellowChannel,IsCyanChannel,IsMagentaChannel
];
(function(){
    function tryGetChannel(validator,subChannel,color) {
        const fitsChannel = validator.call(
            null,color
        );
        if(fitsChannel) {
            return color[subChannel];
        } else {
            return null;
        }
    }
    const colorReturnOrder = [
        "r","g","b","r","g","b"
    ];
    TRY_GET_SHADE.forEach((validator,index)=>{
        TRY_GET_SHADE[index] = tryGetChannel.bind(
            null,validator,colorReturnOrder[index]
        );
    });
})();
function GetImageChannels(data) {
    const channels = GetEmptyChannels();
    const dataLength = data.length;
    const dataView = new DataView(data.buffer);
    for(let index = 0;index<dataLength;index+=4) {
        const color = GetColorData(
            dataView,index
        );
        if(IsFullyTransparent(color)) {
            continue;
        }
        if(IsGrayScale(color)) {
            continue;
        }
        let channel = null, shade;
        for(let channelIndex = 0;channelIndex<CHANNEL_COUNT;channelIndex++) {
            const testShade = TRY_GET_SHADE[channelIndex].call(null,color);
            if(testShade !== null) {
                channel = channels[channelIndex];
                shade = testShade
                break;
            }
        }
        if(channel !== null) {
            channel.push({
                index: index,
                grade: shade / 255,
                alpha: color.a
            });
        }
    }
    return channels;
}
function ApplyColorsToChannel(dataView,channel,color) {
    const channelSize = channel.length;
    for(let index = 0;index<channelSize;index++) {
        const gradeData = channel[index];
        const grade = gradeData.grade;
        const channelLocation = gradeData.index;
        const alpha = gradeData.alpha;

        dataView.setUint32(channelLocation,color);
        const parsedColor = GetColorData(
            dataView,channelLocation
        );

        parsedColor.r = Math.round(parsedColor.r * grade);
        parsedColor.g = Math.round(parsedColor.g * grade);
        parsedColor.b = Math.round(parsedColor.b * grade);

        dataView.setUint8(channelLocation,parsedColor.r);
        dataView.setUint8(channelLocation+1,parsedColor.g);
        dataView.setUint8(channelLocation+2,parsedColor.b);
        dataView.setUint8(channelLocation+3,alpha);
    }
}
function ApplyPaletteToDataByGrade(data,channels,colors) {
    const dataView = new DataView(data.buffer);
    for(let index = 0;index<CHANNEL_COUNT;index++) {
        const channel = channels[index];
        const color = colors[index];
        ApplyColorsToChannel(dataView,channel,color);
    }
}
function ImageGrader(image) {
    const imageWidth = image.width;
    const imageHeight = image.height;
    const testCanvas = new OffscreenCanvas(
        imageWidth,imageHeight
    );
    const testContext = testCanvas.getContext(
        "2d",{alpha:true}
    );
    testContext.drawImage(
        image,0,0,imageWidth,imageHeight,0,0,imageWidth,imageHeight
    );
    const imageData = testContext.getImageData(
        0,0,imageWidth,imageHeight
    );
    const imageChannels = GetImageChannels(
        imageData.data
    );
    const gradedCache = {};
    this.getGraded = palette => {
        palette = ValidatePalette(
            palette,CHANNEL_COUNT
        );
        if(palette.hash in gradedCache) {
            return gradedCache[palette.hash];
        } else {
            const encodedColors = ParsePaletteColors(
                palette.key
            );
            ApplyPaletteToDataByGrade(
                imageData.data,imageChannels,encodedColors
            );
            testContext.putImageData(
                imageData,0,0
            );
            const bitmap = testCanvas.transferToImageBitmap();
            gradedCache[palette.hash] = bitmap;
            return bitmap;
        }
    }
    this.close = () => Object.entries(gradedCache).forEach(entry => {
        entry[1].close();
        delete gradedCache[entry[0]];
    });
}
export default ImageGrader;
