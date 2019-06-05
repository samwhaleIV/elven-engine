const BitmapText = new (function(){

    const textSpacing = 2;
    const wordSpacingFactor = 4;

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
    const textWrapTest = function(words,maxWidth,scale) {
        const horizontalSpace = scale * wordSpacingFactor;
        let xOffset = 0;
        let i = 0;
        let isNewLine = true;
        const wrapRequiredTable = new Array(words.length);
        while(i<words.length) {
            const word = words[i];
            if(textControlCodes[word]) {
                if(word === "\n") {
                    wrapRequiredTable[i] = true;
                    xOffset = 0;
                    isNewLine = true;
                }
            } else {
                if(isNewLine) {
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
                wordTestWidth += word.length * textSpacing;

                xOffset += wordTestWidth;
    
                if(xOffset >= maxWidth) {
                    wrapRequiredTable[i] = true;
                    xOffset = 0;
                }
                if(xOffset) {
                    xOffset += horizontalSpace;
                }
            }
            i++;
        }
        return wrapRequiredTable;
    }
    const drawTextWrappingLookAhead = function(processedText,x,y,maxWidth,scale,color) {
        const wrapRequiredTable = textWrapTest(processedText.full,maxWidth,scale);
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
        drawTextWrapping(wordsAdjusted,x,y,maxWidth,scale,color);
    }
    function drawTextWrapping(words,x,y,maxWidth,scale,color) {
        const horizontalSpace = scale * wordSpacingFactor;
        let xOffset = 0;
        let yOffset = 0;

        let baseColorRow = colorToRow[color];
        let colorRow = baseColorRow;

        const drawHeight = sourceHeight * scale;
        const lineHeight = drawHeight + scale;
        let i = 0;
        context.fillStyle = color;
        let drawingCustomColor = false;
        let isNewLine = true;
        while(i < words.length) {
            const word = words[i];
            if(textControlCodes[word]) {
                if(word === "\n") {
                    xOffset = 0;
                    yOffset += lineHeight;
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
                if(isNewLine) {
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
                wordTestWidth += word.length * textSpacing;
    
                if(xOffset + wordTestWidth >= maxWidth) {
                    xOffset = 0;
                    yOffset += lineHeight
                }
        
                i2 = 0;
                while(i2 < word.length) {
                    const character = BitmapManifest[word[i2]];
                    const drawWidth = character.width * scale;

                    context.drawImage(
                        bitmap,character.x,colorRow*sourceHeight,character.width,sourceHeight,
                        x+xOffset,y+yOffset,drawWidth,drawHeight
                    );

                    xOffset += drawWidth;

                    if(character.extraSpace) {
                        xOffset += character.extraSpace * scale;
                    }
                    if(i2 < word.length-1) {
                        xOffset += textSpacing;
                    }
                    i2++;
                }
                if(xOffset) {
                    xOffset += horizontalSpace;
                }
            }
            i++;
        }
    }
    this.drawTextWrappingLookAheadWhite = (processedText,x,y,maxWidth,scale) => {
        drawTextWrappingLookAhead(processedText,x,y,maxWidth,scale,"white");
    }
    this.drawTextWrappingLookAheadBlack = (processedText,x,y,maxWidth,scale) => {
        drawTextWrappingLookAhead(processedText,x,y,maxWidth,scale,"black");
    }
})();
