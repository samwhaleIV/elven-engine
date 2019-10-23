function CompositeProcessor() {
    let width, height;
    const resetDimensions = () => {
        width = fullWidth;
        height = fullHeight;
    }
    resetDimensions();
    const offscreenCanvas = new OffscreenCanvas(
        width,height
    );
    const offscreenContext = offscreenCanvas.getContext(
        "2d",{alpha:false}
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
    this.render = () => {
        if(!enabled) {
            return;
        }
        if(width !== fullWidth || height !== fullHeight) {
            refreshCanvas();
        }
        offscreenContext.drawImage(
            canvas,0,0,width,height,0,0,width,height
        );
        context.save();
        context.globalCompositeOperation = mode;
        context.drawImage(
            offscreenCanvas,0,0,width,height,
            xOffset,yOffset,width,height
        );
        context.restore();
    }
}
export default CompositeProcessor;
