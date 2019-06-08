const FontText = new (function(){
    this.setFont = font => {
        context.font = font;
    }
    const clearCenterText = () => {
        context.textAlign = "start";
        context.textBaseline = "alphabetic";
    }
    const setCenterText = () => {
        context.textBaseline = "middle";
        context.textAlign = "center";
    }
    this.drawCenteredText = (text,x,y,color) => {
        setCenterText();
        context.fillStyle = color;
        context.fillText(text,x,y);
        clearCenterText();
    }
    const textWrapTest = function(words,maxWidth) {
        const wrapRequiredTable = new Array(words.length);
        let line = "";
        for(let i = 0;i<words.length;i++) {
            const word = words[i];
            if(word === "\n") {
                wrapRequiredTable[i] = true;
                break;
            }
            const newWord = `${word} `;
            const testLine = line + newWord;
            const textWidth = context.measureText(testLine);
            if(textWidth > maxWidth) {
                wrapRequiredTable[i] = true;
                line = newWord;
                break;
            } else {
                line = testLine;
            }
        }
        return wrapRequiredTable;
    }
    const drawTextWrapping = (lines,x,y,lineHeight,color) => {
        context.fillStyle = color;
        let yOffset = 0;
        const lineCount = lines.length;
        for(let i = 0;i<lineCount;i++) {
            context.fillText(lines[i],x,y+yOffset);
            yOffset += lineHeight;
        }
    }
    this.drawTextWrappingLookAheadBlack = (processedText,x,y,maxWidth,lineHeight,font) => {
        this.drawTextWrappingLookAhead(processedText,x,y,maxWidth,lineHeight,font,"black");
    }
    this.drawTextWrappingLookAheadWhite = (processedText,x,y,maxWidth,lineHeight,font) => {
        this.drawTextWrappingLookAhead(processedText,x,y,maxWidth,lineHeight,font,"white");
    }
    this.drawTextWrappingLookAhead = (processedText,x,y,maxWidth,lineHeight,font,color) => {
        context.font = font;
        const wrapRequiredTable = textWrapTest(processedText.full,maxWidth);

        const lines = [];
        let lineBuffer = processedText.sub[0];

        const wordLength = processedText.sub.length;
        const endIndex = wordLength-1;

        for(let i = 1;i<wordLength;i++) {
            const newLine = wrapRequiredTable[i];
            const subWord = processedText.sub[i];
            if(newLine) {
                lines.push(lineBuffer);
                if(subWord !== "\n") {
                    if(i === endIndex) {
                        lineBuffer = subWord;
                    } else {
                        lineBuffer = subWord + " ";
                    }
                } else {
                    lineBuffer = "";
                }
            } else {
                if(i === endIndex) {
                    lineBuffer += subWord;
                } else {
                    lineBuffer += subWord + " ";
                }
            }
        }
        if(lineBuffer) {
            lines.push(lineBuffer);
        }
        drawTextWrapping(lines,x,y,lineHeight,color);
    }
})();
export default FontText;
