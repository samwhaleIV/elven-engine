function CompositeProcessor(alphaContext) {
    alphaContext = alphaContext ? true : false;
    let width = 0, height = 0;
    const resetDimensions = () => {
        if(fullWidth !== undefined) {
            width = fullWidth;
        }
        if(fullHeight !== undefined) {
            height = fullHeight;
        }
    }
    resetDimensions();
    const offscreenCanvas = new OffscreenCanvas(
        width,height
    );
    const offscreenContext = offscreenCanvas.getContext(
        "2d",{alpha:alphaContext}
    );
    const refreshCanvas = () => {
        resetDimensions();
        offscreenCanvas.width = width;
        offscreenCanvas.height = height;
    }
    let enabled = false;
    this.enable = () => {
        enabled = true;
    }
    this.disable = () => {
        enabled = false;
    }
    let mode = "source-over";
    this.setMode = compositeOperation => {
        mode = compositeOperation;
    }
    let xOffset = 0;
    let yOffset = 0;
    this.setOffsets = (x,y) => {
        xOffset = x;
        yOffset = y;
    }
    this.updateSize = () => refreshCanvas();
    this.composite = (buffer,xOffset,yOffset,mode) => {
        context.save();
        context.globalCompositeOperation = mode;
        context.drawImage(
            buffer,0,0,width,height,
            xOffset,yOffset,width,height
        );
        context.restore();
    }
    this.render = () => {
        if(!enabled) {
            return;
        }
        if(alphaContext) {
            offscreenContext.clearRect(0,0,width,height);
        }
        offscreenContext.drawImage(
            canvas,0,0,width,height,0,0,width,height
        );
        this.composite(offscreenCanvas,xOffset,yOffset,mode);
    }
}
export default CompositeProcessor;
