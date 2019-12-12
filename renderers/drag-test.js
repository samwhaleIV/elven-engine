function DragTestRenderer() {
    const box = {
        x: 20,
        y: 20,
        width: 30,
        height: 30,
        color: "red",
        movementOffset: {
            x: 0,
            y: 0
        }
    };

    let capturing = false;

    this.processClick = (x,y) => {
        if(capturing) {
            return;
        } else if(contains(x,y,box)) {
            capturing = true;
            box.movementOffset.x = box.x - x;
            box.movementOffset.y = box.y - y;
        } else {
            box.movementOffset.x = -box.width / 2;
            box.movementOffset.y = -box.height / 2;
            box.x = x + box.movementOffset.x;
            box.y = y + box.movementOffset.y;
            capturing = true;
        }
    }

    this.processClickEnd = (x,y) => {
        capturing = false;
    }

    this.processMove = (x,y) => {
        if(capturing) {
            box.x = x + box.movementOffset.x;
            box.y = y + box.movementOffset.y;
        }
    }

    this.render = () => {
        drawColoredRectangle(box);
    }
}
export default DragTestRenderer;
