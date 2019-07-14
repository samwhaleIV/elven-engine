"use strict";
function drawTextTest(text,scale) {
    let xOffset = 0;
    const drawHeight = 5 * scale;
    const lastOffsetIndex = text.length-1;
    for(let i = 0;i<text.length;i++) {
        const character = fontDictionary[text[i]];
        const drawWidth = character.width * scale;
        xOffset += drawWidth;
        if(i < lastOffsetIndex) {
            xOffset += scale;
        }
    }
    return {
        width: xOffset,
        height: drawHeight
    }
}

const TinyTextScale = 2;
const SmallTextScale = 3;
const MediumTextScale = 4;
const MediumLargeTextScale = 5;
const LargeTextScale = 8;

const TextScales = [
    1,
    TinyTextScale,
    SmallTextScale,
    MediumTextScale,
    MediumLargeTextScale,
    6,
    7,
    LargeTextScale
];

const ScaleMatrices = {
    2.5: {
        1: {width:[3],height:[2,3,2,3,2]},
        2: {width:[3,2],height:[2,3,2,3,2]},
        3: {width:[3,2,2],height:[2,3,2,3,2]},
        5: {width:[3,2,2,2,3],height:[2,3,2,3,2]}
    },
    3.5: {
        1: {width:[4],height:[3,4,3,4,3]},
        2: {width:[4,3],height:[3,4,3,4,3]},
        3: {width:[3,4,3],height:[3,4,3,4,3]},
        5: {width:[4,3,3,3,4],height:[3,4,3,4,3]}
    }
}

function prepareFontDictionary() {
    Object.values(fontDictionary).forEach(character => {
        if(isNaN(character.yOffset)) {
            character.yOffset = 0;
        }
    });
}
prepareFontDictionary();

function generateBasicScaleMatrices() {
    const widths = [1,2,3,5];
    TextScales.forEach(scaleFactor => {
        const characterMatrices = {};
        widths.forEach(widthValue => {
            const characterMatrix = [];
            for(let y = 0;y<5;y++) {
                for(let x = 0;x<widthValue;x++) {
                    characterMatrix.push({
                        x: x * scaleFactor,
                        y: y * scaleFactor,
                        w:scaleFactor,
                        h:scaleFactor
                    });
                }
            }
            characterMatrices[widthValue] = characterMatrix;
        });
        ScaleMatrices[scaleFactor] = characterMatrices;
    });
}
generateBasicScaleMatrices();
function compileComplexScaleMatrices() {
    const widths = [1,2,3,5];
    [2.5,3.5].forEach(scaleFactor => {
        const characterMatrices = {};

        widths.forEach(widthValue => {

            const rawCharacterMatrix = ScaleMatrices[scaleFactor][widthValue];

            const characterMatrix = [];
            let runningHeight = 0;
            for(let y = 0;y<5;y++) {
                const currentHeight = rawCharacterMatrix.height[y];
                let runningWidth = 0;
                for(let x = 0;x<widthValue;x++) {
                    const currentWidth = rawCharacterMatrix.width[x];
                    characterMatrix.push({
                        x: runningWidth,
                        y: runningHeight,
                        w:currentWidth,
                        h:currentHeight
                    });
                    runningWidth += currentWidth;
                }
                runningHeight += currentHeight;
            }
            characterMatrices[widthValue] = characterMatrix;
        });

        ScaleMatrices[scaleFactor] = characterMatrices;
    });
}
compileComplexScaleMatrices();
const allScales = {};

function drawTextStencil(color,text,x,y,scale,padding) {
    let xOffset = 0;
    const scaleMatrix = ScaleMatrices[scale];
    const drawHeight = 5 * scale;
    let i = 0;
    context.beginPath();
    context.fillStyle = color;
    while(i < text.length) {
        const character = fontDictionary[text[i]];
        const drawWidth = character.width * scale;
        const characterMatrix = scaleMatrix[character.width];
        const characterYOffset = character.yOffset * scale;
        let i2 = 0;
        while(i2 < character.glyph.length) {
            if(!character.glyph[i2]) {
                const characterRegion = characterMatrix[i2];
                context.rect(
                    x+xOffset + characterRegion.x,
                    y + characterRegion.y + characterYOffset,
                    characterRegion.w,
                    characterRegion.h
                );
            }
            i2++;
        }

        xOffset += drawWidth;
        if(i < text.length-1) {
            context.rect(x+xOffset,y,scale,drawHeight);
            xOffset += scale;
        }
        i++;
    }

    context.rect(x-padding,y-padding,padding,drawHeight+padding+padding); //Left
    context.rect(x+xOffset,y-padding,padding,drawHeight+padding+padding); //Right
    context.rect(x,y+drawHeight,xOffset,padding); //Bottom
    context.rect(x,y-padding,xOffset,padding); //Top

    context.fill();
    return {
        width: xOffset,
        height: drawHeight
    }
}

function drawTextColor(color,text,x,y,scale) {
    let xOffset = 0;
    const scaleMatrix = ScaleMatrices[scale];
    let i = 0;
    context.beginPath();
    context.fillStyle = color;
    while(i < text.length) {
        const character = fontDictionary[text[i]];
        const drawWidth = character.width * scale;
        const characterMatrix = scaleMatrix[character.width];
        const characterYOffset = character.yOffset * scale;
        let i2 = 0;
        while(i2 < character.glyph.length) {
            if(character.glyph[i2]) {
                const characterRegion = characterMatrix[i2];
                context.rect(
                    x + xOffset + characterRegion.x,
                    y + characterRegion.y + characterYOffset,
                    characterRegion.w,
                    characterRegion.h
                );
            }
            i2++;
        }
        xOffset += drawWidth;
        if(i < text.length-1) {
            xOffset += scale;
        }
        i++;
    }
    context.fill();
    return {
        width: xOffset,
        height: 5 * scale
    }
}

const textControlCodesList = Object.entries(textControlCodes);

const processTextForWrapping = function(text) {
    const words = [];
    let bufferWord = "";

    for(let i = 0;i<text.length;i++) {
        const character = text[i];
        switch(character) {
            default:
                const controlCode = textControlCodes[character];
                if(controlCode) {
                    if(bufferWord) {
                        words.push(bufferWord);
                        bufferWord = "";
                    }
                    words.push(character);
                } else {
                    bufferWord += character;
                }
                break;
            case " ":
                if(bufferWord) {
                    words.push(bufferWord);
                    bufferWord = "";
                }
                break;
        }
    }

    if(bufferWord) {
        words.push(bufferWord);
    }

    return words;
}
const processTextForWrappingLookAhead = function(text,processedFullText) {
    return {
        sub: processTextForWrapping(text),
        full: processedFullText
    }
}
const textWrapTest = function(words,maxWidth,horizontalSpace,scale) {
    let xOffset = 0;
    const textSpacing = scale * 2;
    let i = 0;
    let isNewLine = true;
    const wrapRequiredTable = new Array(words.length);
    while(i < words.length) {
        const word = words[i];
        if(textControlCodes[word]) {
            if(word === "\n") {
                xOffset = 0;
                wrapRequiredTable[i] = true;
                isNewLine = true;
            }
        } else {
            if(!isNewLine) {
                xOffset += textSpacing;
            } else {
                isNewLine = false;
            }
            let wordTestWidth = 0;
            let i2 = 0;
            while(i2 < word.length) {
                wordTestWidth += fontDictionary[word[i2]].width;
                i2++;
            }
            wordTestWidth *= scale;
            if(xOffset + wordTestWidth >= maxWidth) {
                xOffset = 0;
                wrapRequiredTable[i] = true;
            }
            i2 = 0;
            while(i2 < word.length) {
                const character = fontDictionary[word[i2]];
                const drawWidth = character.width * scale;
                xOffset += drawWidth;
                if(i2 < word.length-1) {
                    xOffset += horizontalSpace;
                }
                i2++;
            }
        }
        if(xOffset) {
            xOffset += horizontalSpace;
        }
        i++;
    }
    return wrapRequiredTable;
}
const drawTextWrappingLookAhead = function(processedText,x,y,maxWidth,horizontalSpace,verticalSpace,scale,color) {
    const wrapRequiredTable = textWrapTest(processedText.full,maxWidth,horizontalSpace,scale);
    const wordsAdjusted = [processedText.sub[0]];
    for(let i = 1;i<processedText.sub.length;i++) {
        const newLine = wrapRequiredTable[i];
        const subWord = processedText.sub[i];
        if(newLine) {
            wordsAdjusted.push("\n");
            if(subWord !== "\n") {
                wordsAdjusted.push(subWord);
            }
        } else {
            wordsAdjusted.push(subWord);
        }
    }
    drawTextWrapping(wordsAdjusted,x,y,maxWidth,horizontalSpace,verticalSpace,scale,color);
}
function drawTextWrapping(words,x,y,maxWidth,horizontalSpace,verticalSpace,scale,color) {
    let xOffset = 0;
    let yOffset = 0;
    const scaleMatrix = ScaleMatrices[scale];
    const drawHeight = scale * 5;
    const textSpacing = scale * 2;
    let i = 0;
    context.fillStyle = color;
    let drawingCustomColor = false;
    let isNewLine = true;
    context.beginPath();
    while(i < words.length) {
        const word = words[i];
        if(textControlCodes[word]) {
            if(word === "\n") {
                xOffset = 0;
                yOffset += verticalSpace + drawHeight;
                isNewLine = true;
            } else {
                if(drawingCustomColor) {
                    context.fill();
                    context.fillStyle = color;
                    context.beginPath();
                    drawingCustomColor = false;
                } else {
                    context.fill();
                    const newColor = textColorLookup[
                        word
                    ];
                    context.fillStyle = newColor ? newColor : rainbowGradient;
                    context.beginPath();
                    drawingCustomColor = true;
                }
            }
        } else {
            if(!isNewLine) {
                xOffset += textSpacing;
            } else {
                isNewLine = false;
            }
            let wordTestWidth = 0;
            let i2 = 0;

            while(i2 < word.length) {
                wordTestWidth += fontDictionary[word[i2]].width;
                i2++;
            }
            wordTestWidth *= scale;

            if(xOffset + wordTestWidth >= maxWidth) {
                xOffset = 0;
                yOffset += verticalSpace + drawHeight;
            }
    
            i2 = 0;
            while(i2 < word.length) {
                const character = fontDictionary[word[i2]];
                const drawWidth = character.width * scale;
                const characterMatrix = scaleMatrix[character.width];
                const characterYOffset = character.yOffset * scale;
                let i3 = 0;
                while(i3 < character.glyph.length) {
                    if(character.glyph[i3]) {
                        const characterRegion = characterMatrix[i3];
                        context.rect(
                            x+xOffset + characterRegion.x,
                            y+yOffset + characterRegion.y + characterYOffset,
                            characterRegion.w,
                            characterRegion.h
                        );
                    }
                    i3++;
                }
                xOffset += drawWidth;
                if(i2 < word.length-1) {
                    xOffset += horizontalSpace;
                }
                i2++;
            }
        }
        if(xOffset) {
            xOffset += horizontalSpace;
        }
        i++;
    }
    context.fill();
}
function drawTextWrappingWhite(words,x,y,maxWidth,horizontalSpace,verticalSpace,scale) {
    drawTextWrapping(words,x,y,maxWidth,horizontalSpace,verticalSpace,scale,"white");
}
function drawTextWrappingBlack(words,x,y,maxWidth,horizontalSpace,verticalSpace,scale) {
    drawTextWrapping(words,x,y,maxWidth,horizontalSpace,verticalSpace,scale,"black");
}
function drawTextWrappingLookAheadWhite(processedText,x,y,maxWidth,horizontalSpace,verticalSpace,scale) {
    drawTextWrappingLookAhead(processedText,x,y,maxWidth,horizontalSpace,verticalSpace,scale,"white");
}
function drawTextWrappingLookAheadBlack(processedText,x,y,maxWidth,horizontalSpace,verticalSpace,scale) {
    drawTextWrappingLookAhead(processedText,x,y,maxWidth,horizontalSpace,verticalSpace,scale,"black");
}

function drawTextWhite(text,x,y,scale) {
    return drawTextColor("white",text,x,y,scale);
}
function drawTextBlack(text,x,y,scale) {
    return drawTextColor("black",text,x,y,scale);
}

const cornerTextMargin = 30;
const halfCornerTextMargin = cornerTextMargin / 2;

const textTestData = drawTextTest("loading...",MediumTextScale);
textTestData.width += cornerTextMargin;
textTestData.height += cornerTextMargin;

function drawCornerText(text) {
    const textTestData = drawTextTest(text,MediumTextScale);
    context.fillStyle = "black";
    context.fillRect(0,0,textTestData.width+cornerTextMargin,textTestData.height+cornerTextMargin);
    drawTextWhite(text,halfCornerTextMargin,halfCornerTextMargin,MediumTextScale);
}

function drawLoadingText() {
    context.fillStyle = "black";
    context.fillRect(0,0,textTestData.width,textTestData.height);
    drawTextWhite("loading...",halfCornerTextMargin,halfCornerTextMargin,MediumTextScale);
}
