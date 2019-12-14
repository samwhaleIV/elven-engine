const TRANSITION_DURATION = 500;

function LetterUI(message,callback) {
    message = processTextForWrapping(message);
    let start = null;
    let endStart = null;
    this.progress = () => {
        if(start === null) {
            return;
        }
        const now = performance.now();
        if(now < start + TRANSITION_DURATION) {
            return;
        }
        if(endStart === null) {
            endStart = now;
        }
    }
    this.render = timestamp => {
        let yOffset = 0;
        if(endStart) {
            const delta = (timestamp - endStart) / TRANSITION_DURATION;
            if(delta > 1) {
                if(callback) {
                    callback();
                }
                return;
            }
            yOffset = delta;
        } else if(start === null) {
            start = timestamp;
            yOffset = -1;
        } else {
            const delta = Math.min((timestamp - start) / TRANSITION_DURATION,1);
            yOffset = 1 - delta;
        }
        yOffset = Math.floor(yOffset * fullHeight);

        const popupWidth = Math.min(800,fullWidth-20);
        const popupHeight = fullHeight - 20;

        const popupY = fullHeight - 10 - popupHeight + yOffset;
        this.startY = popupY;
        const popupX = Math.round(halfWidth - popupWidth / 2);
        context.fillStyle = "white";
        context.fillRect(
            popupX,
            popupY,
            popupWidth,popupHeight
        );
        BitmapText.drawTextWrappingBlack(
            message,popupX + 20,
            popupY + 20,
            popupWidth-40,
            4
        );
    }
}
export default LetterUI;
