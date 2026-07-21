import L from "leaflet";
import { THEME_COLORS } from "../theme/colors.js";

const canvasPool = [];

export const TopographicTileLayer = L.GridLayer.extend({
    initialize: function (options) {
        L.GridLayer.prototype.initialize.call(this, options);
        this.on("tileunload", this._onTileUnload, this);
    },

    _onTileUnload: function (e) {
        const tile = e.tile;
        if (tile && tile.nodeName === "CANVAS") {
            // Reset to 1x1 to immediately deallocate CPU/GPU backing stores
            tile.width = 1;
            tile.height = 1;
            canvasPool.push(tile);
        }
    },

    _getPooledCanvas: function (size) {
        let canvas = canvasPool.pop();
        if (!canvas)
            canvas = document.createElement("canvas");

        canvas.width = size.x;
        canvas.height = size.y;
        return canvas;
    },

    createTile: function (coords, done) {
        const size = this.getTileSize();
        const canvas = this._getPooledCanvas(size);
        const ctx = canvas.getContext("2d");

        this._renderTopography(ctx, coords, size.x, size.y);

        // Synchronously call done without setTimeout deferrals
        done(null, canvas);
        return canvas;
    },

    _renderTopography: function (ctx, coords, width, height) {
        ctx.fillStyle = THEME_COLORS.terrain;
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = "#242a38";
        ctx.lineWidth = 1;
        const step = 64;
        ctx.beginPath();
        for (let x = step; x < width; x += step) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
        }
        for (let y = step; y < height; y += step) {
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
        }
        ctx.stroke();

        const hash = Math.sin(coords.x * 12.9898 + coords.y * 78.233 + coords.z * 43.123) * 43758.5453;
        const numContours = Math.floor(Math.abs(hash) % 3) + 1;

        ctx.strokeStyle = "#2c3447";
        ctx.lineWidth = 1.5;
        for (let i = 1; i <= numContours; i++) {
            const radius = Math.abs(Math.sin(hash + i)) * 60 + 20;
            const centerX = Math.abs(Math.cos(hash * i)) * (width - 60) + 30;
            const centerY = Math.abs(Math.sin(hash / i)) * (height - 60) + 30;
            ctx.beginPath();
            ctx.ellipse(centerX, centerY, radius, radius * 0.7, hash, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.fillStyle = "#4a5568";
        ctx.font = "10px sans-serif";
        ctx.fillText(`z${coords.z} / ${coords.x} / ${coords.y}`, 8, 16);
    }
});

export function topographicTileLayer(options) {
    return new TopographicTileLayer(options);
}
