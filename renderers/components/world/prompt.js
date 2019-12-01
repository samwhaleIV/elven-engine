import { SelectionChangeSound, SelectionConfirmSound } from "../../../runtime/tones.js";

function WorldPrompt(text,selections,callback) {

    text = processTextForWrapping(text);

    for(let i = 0;i<selections.length;i++) {
        const selection = selections[i];
        selections[i] = `>${selection}`;
    }

    this.selectionIndex = 0;
    let terminated = false;

    this.confirmSelection = function() {
        if(this.selectionIndex !== null) {
            SelectionConfirmSound();
            callback(this.selectionIndex);
            terminated = true;
            return true;
        }
        return false;
    }
    this.moveSelection = function(direction) {
        switch(direction) {
            case "down":
            case "right":
                if(this.selectionIndex === null) {
                    this.selectionIndex = 0;
                } else {
                    if(++this.selectionIndex >= selections.length) {
                        this.selectionIndex = 0;
                    }
                }
                SelectionChangeSound();
                break;
            case "up":
            case "left":
                if(this.selectionIndex === null) {
                    this.selectionIndex = 0;
                } else {
                    if(--this.selectionIndex < 0) {
                        this.selectionIndex = selections.length-1;
                    }
                }
                break;
            default:
                return;
        }
        SelectionChangeSound();
    }

    const largeTextScale = 4;
    const smallTextScale = 3;

    this.startY = 0;

    this.render = function() {
        if(terminated) {
            return;
        }

        const textScale = fullWidth > 600 ? largeTextScale : smallTextScale;

        const popupWidth = halfWidth > 700 ? halfWidth : fullWidth < 700 ? fullWidth - 20 : 700 - 20;
        const popupHeight = fullHeight < 290 ? fullHeight - 20 : 270;

        const popupY = fullHeight - 10 - popupHeight;
        this.startY = popupY;
        const popupX = Math.round(
            halfWidth - popupWidth / 2
        );

        const textX = popupX + 20;
        let textY = popupY + 20;

        context.fillStyle = "black";
        context.fillRect(
            popupX-3,
            popupY-3,
            popupWidth+6,
            popupHeight+6
        );
        context.fillStyle = "white";
        context.fillRect(
            popupX,
            popupY,
            popupWidth,popupHeight
        );
        drawTextWrappingBlack(text,
            textX,
            textY,
            popupWidth - 50,
            2,8,
            textScale
        );
        textY += 63;
        let i = 0;
        while(i < selections.length) {
            if(this.selectionIndex === i) {
                drawTextStencil("black",selections[i],textX,textY,textScale,10);
            } else {
                drawTextBlack(selections[i],textX,textY,textScale);
            }
            textY += 40;
            i++;
        }
    }
}
export default WorldPrompt;
