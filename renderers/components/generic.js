function drawRectangle(rectangle,color) {
    context.fillStyle = color;
    context.fillRect(
        rectangle.x,rectangle.y,rectangle.width,rectangle.height
    );
}

function drawColoredRectangle(rectangle) {
    context.fillStyle = rectangle.color;
    context.fillRect(
        rectangle.x,rectangle.y,rectangle.width,rectangle.height
    );
}

function contains(x,y,r) {
    return x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height;
}
function areaContains(x,y,rx,ry,rw,rh) {
    return x >= rx && x <= rx + rw && y >= ry && y <= ry + rh;
}

function drawOutline(x,y,width,height,size,color) {
    //Prefer stroke, but we can use this because stroke is mean on odd pixels.
    //This simply works the same regardless of cooridinate.
    //... that doesn't mean it's always better, just, it's better /sometimes TM/
    context.fillStyle = color;
    context.beginPath();
    context.rect(
        x-size,
        y-size,
        size,
        height+size
    );
    context.rect(
        x+width,
        y-size,
        size,
        height+size+size
    );
    context.rect(
        x-size,
        y-size,
        width+size,
        size
    );
    context.rect(
        x-size,
        y+height,
        width+size,
        size
    );
    context.fill();
}
