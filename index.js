//canvas setup
const canvas = document.getElementById("canvas");
canvas.width = 320;
canvas.height = 240;
const ctx = canvas.getContext("2d");

//textures setup
const texture_image_path = "assets/textures/js-minecraft-v2.png"
const texture_image = new Image()
texture_image.src = texture_image_path

// config
const WORLD_HEIGHT = 20;
const WORLD_CHUNK_SIZE_X = 10;
const WORLD_CHUNK_SIZE_Y = 10;
const CHUNK_SIZE_X = 20;
const CHUNK_SIZE_Y = 20;

// global variables
let globalRotation = 0;
let cameraX = 0;
let cameraY = 0;


class Chunk {
    constructor(x, y) {
        this.chunkX = x;
        this.chunkY = y;
        this.data = this.makeChunk();
    }

    //generate a chunk of size specified in config variables
    makeChunk() {
        let chunkData = new Array(WORLD_HEIGHT)
        for (let level = 0; level < WORLD_HEIGHT; level++) {
            chunkData[level] = new Array(CHUNK_SIZE_X);
            for (let x = 0; x < CHUNK_SIZE_X; x++) {
                chunkData[level][x] = new Array(CHUNK_SIZE_Y);
            }
        }
        return chunkData;
    }
}

class Block {
    constructor(x, y, z, blockId, blockRotation = 0) {
        this.blockX = x;
        this.blockY = y;
        this.blockZ = z;
        this.setBlockId(blockId)
        this.blockRotation = blockRotation;
        this.visible = true;
    }

    setBlockId(blockId){
        this.blockId = blockId;
        //IDs of transparent blocks (glass, leaves, etc.)
        if (blockId === 11 && blockId == 12 || this.blockId === 13 || this.blockId === 20){
            this.visible = false;
        }
    }
}

//array of chunks
let world = new Array(WORLD_CHUNK_SIZE_X).fill(null).map(() => new Array(WORLD_CHUNK_SIZE_Y));

let buttonPressedUpArrow = false;
let buttonPressedDownArrow = false;
let buttonPressedLeftArrow = false;
let buttonPressedRightArrow = false;


window.onkeydown = (e) => {
    switch (e.key) {
        case "ArrowUp":
            buttonPressedUpArrow = true;
            break;
        case "ArrowDown":
            buttonPressedDownArrow = true;
            break;
        case "ArrowLeft":
            buttonPressedLeftArrow = true;
            break;
        case "ArrowRight":
            buttonPressedRightArrow = true;
            break;
        case "e":
            globalRotation += 90;
            break;
        case "q":
            if (globalRotation === 0) globalRotation = 360
            else globalRotation -= 90;
    }
}

window.onkeyup = (e) => {
    switch (e.key) {
        case "ArrowUp":
            buttonPressedUpArrow = false;
            break;
        case "ArrowDown":
            buttonPressedDownArrow = false;
            break;
        case "ArrowLeft":
            buttonPressedLeftArrow = false;
            break;
        case "ArrowRight":
            buttonPressedRightArrow = false;
            break;
    }
}

function parseInput() {
    if (buttonPressedUpArrow) {
        cameraY -= 1;
    }
    if (buttonPressedDownArrow) {
        cameraY += 1;
    }
    if (buttonPressedLeftArrow) {
        cameraX -= 1;
    }
    if (buttonPressedRightArrow) {
        cameraX += 1;
    }
}


function fillChunkSlice(chunk, x, y, totalHeight, dirtHeight) {
    for (let level = 1; level < totalHeight; level++) {
        let blockId = 4;
        if (level < dirtHeight) blockId = 2;
        if (level === totalHeight - 1) blockId = 5; //grass on top layer
        chunk.data[level][x][y].setBlockId(blockId);

        // chunk.data[level][x][y].blockId = level % 2+2;
    }
}

function rotateCoordinates(x, y, angle) {
    const radians = (angle * Math.PI) / 180;
    const rotatedX = Math.round(x * Math.cos(radians) - y * Math.sin(radians));
    const rotatedY = Math.round(x * Math.sin(radians) + y * Math.cos(radians));
    return [rotatedX, rotatedY];
}

function isBlockVisible(chunk, x, y, z) {
    // Out-of-bounds blocks are considered empty
    const isTransparent = (cx, cy, cz) => {
        if (
            cx < 0 || cx >= CHUNK_SIZE_X ||
            cy < 0 || cy >= CHUNK_SIZE_Y ||
            cz < 0 || cz >= WORLD_HEIGHT
        ) {
            return true;
        }
        const block = chunk.data[cz][cx][cy];
        return block.visible;
    };

    // Check all six directions
    return (
        isTransparent(x - 1, y, z) ||
        isTransparent(x + 1, y, z) ||
        isTransparent(x, y - 1, z) ||
        isTransparent(x, y + 1, z) ||
        (z != 0 && isTransparent(x, y, z - 1)) ||
        isTransparent(x, y, z + 1)
    );
}

function updateChunkVisibility(chunk) {
    for (let z = 0; z < WORLD_HEIGHT; z++) {
        for (let x = 0; x < CHUNK_SIZE_X; x++) {
            for (let y = 0; y < CHUNK_SIZE_Y; y++) {
                chunk.data[z][x][y].visible = isBlockVisible(chunk, x, y, z);
            }
        }
    }
}


function buildZBuffer(world, rotationAngle) {
    let zBuffer = [];

    for (let chunkRow = 0; chunkRow < WORLD_CHUNK_SIZE_Y; chunkRow++) {
        for (let chunkCol = 0; chunkCol < WORLD_CHUNK_SIZE_X; chunkCol++) {
            let chunk = world[chunkRow][chunkCol];

            // console.log("Placing chunk at: " + world[chunkRow][chunkCol].chunkX + ", " + world[chunkRow][chunkCol].chunkY)

            for (let level = 0; level < WORLD_HEIGHT; level++) {
                for (let x = 0; x < CHUNK_SIZE_X; x++) {
                    for (let y = 0; y < CHUNK_SIZE_Y; y++) {
                        let block = chunk.data[level][x][y];
                        if (!block) continue; // Skip empty spaces
                        // Calculate global coordinates
                        let globalX = chunkRow * CHUNK_SIZE_X + x;
                        let globalY = chunkCol * CHUNK_SIZE_Y + y;
                        // Rotate coordinates
                        let [rotatedX, rotatedY] = rotateCoordinates(globalX, globalY, rotationAngle);
                        // Add to zBuffer
                        zBuffer.push({
                            block: block,
                            globalX: rotatedX,
                            globalY: rotatedY,
                            level: level,
                            z_index: level + rotatedY * 16 + rotatedX
                        });
                    }
                }
            }
        }
    }

    // Sort by z_index
    zBuffer.sort((a, b) => a.z_index - b.z_index);

    return zBuffer;
}

function buildZBufferOptimized(world, rotationAngle) {
    let zBuffer = [];

    for (const chunk of world) {
        // console.log("Placing chunk at: " + world[chunkRow][chunkCol].chunkX + ", " + world[chunkRow][chunkCol].chunkY)

        for (let level = 0; level < WORLD_HEIGHT; level++) {
            for (let x = 0; x < CHUNK_SIZE_X; x++) {
                for (let y = 0; y < CHUNK_SIZE_Y; y++) {

                    let block = chunk.data[level][x][y];

                    if (!block) continue; // Skip empty spaces
                    if (!block.visible){
                        continue;
                    }


                    // Calculate global coordinates
                    let globalX = chunk.chunkX * CHUNK_SIZE_X + x;
                    let globalY = chunk.chunkY * CHUNK_SIZE_Y + y;

                    // Rotate coordinates
                    let [rotatedX, rotatedY] = rotateCoordinates(globalX, globalY, rotationAngle);
                    // Add to zBuffer
                    zBuffer.push({
                        block: block,
                        globalX: rotatedX,
                        globalY: rotatedY,
                        level: level,
                        z_index: level + rotatedY * 16 + rotatedX
                    });
                }
            }
        }
    }
    // Sort by z_index
    zBuffer.sort((a, b) => a.z_index - b.z_index);
    return zBuffer;
}

function drawScene(zBuffer, cameraX, cameraY) {
    for (let item of zBuffer) {
        const {block, globalX, globalY, level} = item;

        // Convert to screen coordinates
        let screenX = (globalX) * 16 - cameraX;
        let screenY = (globalY) * 16 - level * 16 - cameraY;

        // Draw the block
        switch (block.blockId) {
            case 1:
                ctx.drawImage(texture_image, 0, 0, 16, 32, screenX, screenY, 17, 32);
                break;
            case 2:
                ctx.drawImage(texture_image, 16, 0, 16, 32, screenX, screenY, 17, 32);
                break;
            case 3:
                ctx.drawImage(texture_image, 32, 0, 16, 32, screenX, screenY, 17, 32);
                break;
            case 4:
                ctx.drawImage(texture_image, 48, 0, 16, 32, screenX, screenY, 17, 32);
                break;
            case 5:
                ctx.drawImage(texture_image, 64, 0, 16, 32, screenX, screenY, 17, 32);
                break;
        }
    }
}


function generateWorld() {
    perlin.seed();

    for (let chunkX = 0; chunkX < WORLD_CHUNK_SIZE_X; chunkX++) {
        for (let chunkY = 0; chunkY < WORLD_CHUNK_SIZE_Y; chunkY++) {
            // Create and initialize the chunk
            let chunk = new Chunk(chunkX, chunkY);

            for (let blockLevel = 0; blockLevel < WORLD_HEIGHT; blockLevel++) {
                for (let blockX = 0; blockX < CHUNK_SIZE_X; blockX++) {
                    for (let blockY = 0; blockY < CHUNK_SIZE_Y; blockY++) { // Use CHUNK_SIZE_Y
                        chunk.data[blockLevel][blockX][blockY] = new Block(blockX, blockY, blockLevel, 0, 0);
                    }
                }
            }

            for (let blockX = 0; blockX < CHUNK_SIZE_X; blockX++) {
                for (let blockY = 0; blockY < CHUNK_SIZE_Y; blockY++) { // Use CHUNK_SIZE_Y
                    // Create bedrock layer
                    chunk.data[0][blockX][blockY].blockId = 1;

                    // Fill chunk with stone and dirt
                    let perlinX = chunkX * CHUNK_SIZE_X + blockX;
                    let perlinY = chunkY * CHUNK_SIZE_Y + blockY;
                    let v = Math.floor(8 + perlin.get(perlinX / 10, perlinY / 10) * 5);
                    fillChunkSlice(chunk, blockX, blockY, v, 3);
                }
            }

            updateChunkVisibility(chunk)

            // Assign chunk to the world
            world[chunkX][chunkY] = chunk;
        }
    }
}

function updateVisibleWorld(cameraX, cameraY, viewportWidth, viewportHeight) {
    const visibleWorld = [];

    // Determine the range of chunks visible on screen
    const startChunkX = Math.floor((cameraX) / (CHUNK_SIZE_X * 16));
    const startChunkY = Math.floor((cameraY+160) / (CHUNK_SIZE_Y * 16));
    const endChunkX = Math.ceil((cameraX + viewportWidth) / (CHUNK_SIZE_X * 16));
    const endChunkY = Math.ceil((cameraY + viewportHeight+64) / (CHUNK_SIZE_Y * 16));

    console.log("startX: " + startChunkX + " endX: " + endChunkX + " startY: " + startChunkY + " endY: " + endChunkY)

    // Add chunks in the visible range to the visibleWorld array
    for (let chunkX = startChunkX; chunkX < endChunkX; chunkX++) {
        for (let chunkY = startChunkY; chunkY < endChunkY; chunkY++) {
            // Ensure chunk indices are within the world bounds
            if (chunkX >= 0 && chunkX < WORLD_CHUNK_SIZE_X && chunkY >= 0 && chunkY < WORLD_CHUNK_SIZE_Y) {
                visibleWorld.push(world[chunkX][chunkY]);
            }
        }
    }

    return visibleWorld;
}

function render() {
    let visibleWorld = updateVisibleWorld(cameraX, cameraY, canvas.width, canvas.height);
    // let zBuffer = buildZBuffer(world, globalRotation); // deprecated
    let zBuffer = buildZBufferOptimized(visibleWorld, globalRotation);
    drawScene(zBuffer, cameraX, cameraY);
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    parseInput()
    render()
}


texture_image.onload = () => {
    generateWorld()
    console.log(world)
    setInterval(gameLoop, 10);
}

