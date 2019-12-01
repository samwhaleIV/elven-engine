function UIAlert(message,timeout,noSound) {
    let done = false;
    if(!noSound) {
        playSound("energy");
    }
    let startTime = performance.now();
    this.render = timestamp => {
        if(done) {
            return false;
        }
        if(timestamp - startTime >= timeout) {
            done = true;
            return false;
        }
        drawCornerText(message);
        return true;
    }
}
export default UIAlert;
