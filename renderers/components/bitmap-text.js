const BitmapText = new (function(){
    let bitmap = null;
    let sourceHeight = null;

    const colorToRow = {
        "white": 1,
        "black": 0
    };
    colorToRow[inverseTextColorLookup["red"]] = 2;
    colorToRow[inverseTextColorLookup["blue"]] = 3;
    colorToRow[inverseTextColorLookup["green"]] = 5;
    colorToRow[inverseTextColorLookup["goldenrod"]] = 4;
    colorToRow[inverseTextColorLookup["blueviolet"]] = 6;
    colorToRow[inverseTextColorLookup["darkorange"]] = 8;
    colorToRow[inverseTextColorLookup["deeppink"]] = 7;

    this.verifyBitmap = () => {
        bitmap = imageDictionary["elven-font"];
        sourceHeight = bitmap.height / Object.keys(colorToRow).length;
    }
    const textWrapTest = function(words,maxWidth,horizontalSpace,scale) {
        let xOffset = 0;
        const textSpacing = scale * 3.5;
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
                    const character = BitmapManifest[word[i2]];
                    wordTestWidth += character.width;
                    if(character.extraSpace) {
                        wordTestWidth += character.extraSpace;
                    }
                    i2++;
                }
                wordTestWidth *= scale;
                if(xOffset + wordTestWidth >= maxWidth) {
                    xOffset = 0;
                    wrapRequiredTable[i] = true;
                }
                i2 = 0;
                while(i2 < word.length) {
                    const character = BitmapManifest[word[i2]];
                    const drawWidth = character.width * scale;
                    xOffset += drawWidth;
                    if(character.extraSpace) {
                        xOffset += character.extraSpace * scale;
                    }
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

        let baseColorRow = colorToRow[color];
        let colorRow = baseColorRow;

        const drawHeight = sourceHeight * scale;
        const textSpacing = scale * 3.5;

        let i = 0;
        context.fillStyle = color;
        let drawingCustomColor = false;
        let isNewLine = true;
        while(i < words.length) {
            const word = words[i];
            if(textControlCodes[word]) {
                if(word === "\n") {
                    xOffset = 0;
                    yOffset += verticalSpace + drawHeight;
                    isNewLine = true;
                } else {
                    if(drawingCustomColor) {
                        colorRow = baseColorRow;
                        drawingCustomColor = false;
                    } else {
                        colorRow = colorToRow[word];
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
                    const character = BitmapManifest[word[i2]];
                    wordTestWidth += character.width;
                    if(character.extraSpace) {
                        wordTestWidth += character.extraSpace;
                    }
                    i2++;
                }
                wordTestWidth *= scale;
    
                if(xOffset + wordTestWidth >= maxWidth) {
                    xOffset = 0;
                    yOffset += verticalSpace + drawHeight;
                }
        
                i2 = 0;
                while(i2 < word.length) {
                    const character = BitmapManifest[word[i2]];
                    const drawWidth = character.width * scale;

                    context.drawImage(
                        bitmap,character.x,colorRow*sourceHeight,character.width,sourceHeight,
                        x+xOffset,y+yOffset,character.width*scale,drawHeight
                    );
                    
                    xOffset += drawWidth;
                    if(character.extraSpace) {
                        xOffset += character.extraSpace * scale;
                    }
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
    }
    this.drawTextWrappingLookAheadWhite = (processedText,x,y,maxWidth,horizontalSpace,verticalSpace,scale) => {
        drawTextWrappingLookAhead(processedText,x,y,maxWidth,horizontalSpace,verticalSpace,scale,"white");
    }
    this.drawTextWrappingLookAheadBlack = (processedText,x,y,maxWidth,horizontalSpace,verticalSpace,scale) => {
        drawTextWrappingLookAhead(processedText,x,y,maxWidth,horizontalSpace,verticalSpace,scale,"black");
    }
})();
