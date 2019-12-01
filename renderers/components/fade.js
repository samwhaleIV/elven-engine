function Fade(duration,start,end,polarity,grayScale=0) {
    let fadeStart = start ? start : null;
    let finished = false;
    this.render = timestamp => {
        if(!fadeStart) {
            fadeStart = timestamp;
        }
        let progress = (timestamp - fadeStart) / duration;
        if(progress > 1) {
            progress = 1;
            if(!finished) {
                finished = true;
                if(end) {
                    end();
                }
            }
        }
        const gradientValue = polarity ? progress : 1 - progress;
        context.fillStyle = `rgba(${grayScale},${grayScale},${grayScale},${gradientValue})`;
        context.fillRect(0,0,fullWidth,fullHeight);
    }
}

function FadeOut(duration,start,end,grayScale) {
    Fade.call(this,duration,start,end,true,grayScale);
}
function FadeIn(duration,start,end,grayScale) {
    Fade.call(this,duration,start,end,false,grayScale);
}
export {FadeIn,FadeOut}
