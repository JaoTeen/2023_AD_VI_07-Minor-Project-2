/* 15.5.2023: Optimization*/

class Chart {
   constructor(container, samples, options, onClick = null) {
      this.samples = samples;

      this.axesLabels = options.axesLabels;
      this.styles = options.styles;
      this.icon = options.icon;
      this.hideSamples = options.hideSamples;
      this.bg = options.bg;
      
      if (this.bg) {
         this.bg.onload = () => this.#draw();
         this.bg.onerror = () => (this.bg = null);
      }
      
      Object.values(this.styles).forEach(
         (s) => (s.image.onload = () => this.#draw())
      );

      this.onClick = onClick;

      this.canvas = document.createElement("canvas");
      this.canvas.width = options.size+20;
      this.canvas.height = options.size+25;
      this.canvas.style = "background-color:white;";

      container.appendChild(this.canvas);

      this.ctx = this.canvas.getContext("2d");
      this.ctx.imageSmoothingEnabled = false;

      /*
       * for optimization
       */
      this.overlayCanvas = document.createElement("canvas");
      this.overlayCanvas.width = options.size;
      this.overlayCanvas.height = options.size;
      this.overlayCanvas.style.position = "absolute";
      this.overlayCanvas.style.left = "0px";
      this.overlayCanvas.style.pointerEvents = "none";
      container.appendChild(this.overlayCanvas);

      this.overlayCtx = this.overlayCanvas.getContext("2d");
      this.overlayCtx.imageSmoothingEnabled = false;

      this.margin = options.size * 0.11;
      this.transparency = options.transparency || 1;

      this.dataTrans = {
         offset: [0, 0],
         scale: 1,
      };
      this.dragInfo = {
         start: [0, 0],
         end: [0, 0],
         offset: [0, 0],
         dragging: false,
      };

      this.hoveredSample = null;
      this.selectedSample = null;

      this.pixelBounds = this.#getPixelBounds();
      this.dataBounds = this.#getDataBounds();
      this.defaultDataBounds = this.#getDataBounds();

      this.dynamicPoint = null;
      this.nearestSamples = null;

      this.#draw();

      this.#addEventListeners();
   }

   showDynamicPoint(point, label, nearestSamples) {
      this.dynamicPoint = { point, label };
      this.nearestSamples = nearestSamples;
      this.#drawOverlay();
   }

   hideDynamicPoint() {
      this.dynamicPoint = null;
      this.#drawOverlay();
   }

   #addEventListeners() {
      const { canvas, dataTrans, dragInfo } = this;
      canvas.onmousedown = (evt) => {
         const dataLoc = this.#getMouse(evt, true);
         dragInfo.start = dataLoc;
         dragInfo.dragging = true;
         dragInfo.end = [0, 0];
         dragInfo.offset = [0, 0];
      };
      canvas.onmousemove = (evt) => {
         if (dragInfo.dragging) {
            const dataLoc = this.#getMouse(evt, true);
            dragInfo.end = dataLoc;
            dragInfo.offset = math.scale(
               math.subtract(dragInfo.start, dragInfo.end),
               dataTrans.scale ** 2
            );
            const newOffset = math.add(dataTrans.offset, dragInfo.offset);
            this.#updateDataBounds(newOffset, dataTrans.scale);
         }
         const pLoc = this.#getMouse(evt);
         const pPoints = this.samples.map((s) =>
            math.remapPoint(this.dataBounds, this.pixelBounds, s.point)
         );
         const index = math.getNearest(pLoc, pPoints);
         const nearest = this.samples[index];
         const dist = math.distance(pPoints[index], pLoc);
         if (dist < this.margin / 2) {
            this.hoveredSample = nearest;
         } else {
            this.hoveredSample = null;
         }

         if (dragInfo.dragging) {
            this.#draw();
            this.#drawOverlay();
         } else {
            this.#drawOverlay();
         }
      };
      canvas.onmouseup = () => {
         dataTrans.offset = math.add(dataTrans.offset, dragInfo.offset);
         dragInfo.dragging = false;
      };
      canvas.onwheel = (evt) => {
         const dir = Math.sign(evt.deltaY);
         const step = 0.02;
         //dataTrans.scale += dir * step;
         //dataTrans.scale = Math.max(step, Math.min(2, dataTrans.scale));
         /*
          * optimization
          */
         const scale = 1 + dir * step;
         dataTrans.scale *= scale;

         this.#updateDataBounds(dataTrans.offset, dataTrans.scale);

         this.#draw();
         this.#drawOverlay();

         evt.preventDefault();
      };
      canvas.onclick = () => {
         if (!math.equals(dragInfo.offset, [0, 0])) {
            return;
         }
         if (this.hoveredSample) {
            if (this.selectedSample == this.hoveredSample) {
               this.selectedSample = null;
            } else {
               this.selectedSample = this.hoveredSample;
            }
         } else {
            this.selectedSample = null;
         }
         if (this.onClick) {
            this.onClick(this.selectedSample);
         }
         this.#draw();
         this.#drawOverlay();
      };
   }

   #updateDataBounds(offset, scale) {
      const { dataBounds, defaultDataBounds: def } = this;
      dataBounds.left = def.left + offset[0];
      dataBounds.right = def.right + offset[0];
      dataBounds.top = def.top + offset[1];
      dataBounds.bottom = def.bottom + offset[1];

      const center = [
         (dataBounds.left + dataBounds.right) / 2,
         (dataBounds.top + dataBounds.bottom) / 2,
      ];

      dataBounds.left = math.lerp(center[0], dataBounds.left, scale ** 2);

      dataBounds.right = math.lerp(center[0], dataBounds.right, scale ** 2);

      dataBounds.top = math.lerp(center[1], dataBounds.top, scale ** 2);

      dataBounds.bottom = math.lerp(center[1], dataBounds.bottom, scale ** 2);
   }

   #getMouse = (evt, dataSpace = false) => {
      const rect = this.canvas.getBoundingClientRect();
      const pixelLoc = [evt.clientX - rect.left, evt.clientY - rect.top];
      if (dataSpace) {
         const dataLoc = math.remapPoint(
            this.pixelBounds,
            this.defaultDataBounds,
            pixelLoc
         );
         return dataLoc;
      }
      return pixelLoc;
   };

   #getPixelBounds() {
      const { canvas, margin } = this;
      const bounds = {
         left: margin,
         right: canvas.width - margin,
         top: margin,
         bottom: canvas.height - margin,
      };
      return bounds;
   }

   #getDataBounds() {
      const { samples } = this;
      const x = samples.map((s) => s.point[0]);
      const y = samples.map((s) => s.point[1]);
      const minX = Math.min(...x);
      const maxX = Math.max(...x);
      const minY = Math.min(...y);
      const maxY = Math.max(...y);
      const deltaX = maxX - minX;
      const deltaY = maxY - minY;
      const maxDelta = Math.max(deltaX, deltaY);
      const bounds = {
         left: minX,
         right: maxX, //minX+maxDelta,
         top: maxY, //minY+maxDelta,
         bottom: minY,
      };
      return bounds;
   }

   #draw() {
      const { ctx, canvas } = this;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const topLeft = math.remapPoint(
         this.dataBounds,
         this.pixelBounds,
         [0, 1]
      );
      const bottomRight = math.remapPoint(
         this.dataBounds,
         this.pixelBounds,
         [1, 0]
      );
      const sz = (canvas.width - this.margin * 2) / this.dataTrans.scale ** 2;
      this.bg &&
         ctx.drawImage(
            this.bg,
            ...topLeft,
            bottomRight[0] - topLeft[0],
            bottomRight[1] - topLeft[1]
         );

      ctx.globalAlpha = this.transparency;
      this.#drawSamples(this.samples, ctx);
      ctx.globalAlpha = 1;

      this.#drawAxes(ctx);
   }

   #drawOverlay() {
      this.overlayCtx.clearRect(
         0,
         0,
         this.overlayCanvas.width,
         this.overlayCanvas.height
      );

      if (this.hoveredSample) {
         this.#emphasizeSample(this.hoveredSample);
      }

      if (this.selectedSample) {
         if (this.nearestSamples && !this.dynamicPoint) {
            const pixelLoc = math.remapPoint(
               this.dataBounds,
               this.pixelBounds,
               this.selectedSample.point
            );
            this.#showNearest(pixelLoc);
         }
         this.#emphasizeSample(this.selectedSample, "yellow");
      }

      if (this.dynamicPoint) {
         const { point, label } = this.dynamicPoint;
         const pixelLoc = math.remapPoint(
            this.dataBounds,
            this.pixelBounds,
            point
         );
         graphics.drawPoint(
            this.overlayCtx,
            pixelLoc,
            "rgba(255,255,255,0.7)",
            10000000
         );
         if (this.nearestSamples) {
            this.#showNearest(pixelLoc);
         }
         graphics.drawImage(
            this.overlayCtx,
            this.styles[label].image,
            pixelLoc
         );
      }

      this.#drawAxes(this.overlayCtx);
   }

   #showNearest(pixelLoc) {
      if (this.samples[0].truth) {
         return;
      }
      this.overlayCtx.strokeStyle = "black";
      for (const sample of this.nearestSamples) {
         const point = math.remapPoint(
            this.dataBounds,
            this.pixelBounds,
            sample.point
         );
         this.overlayCtx.beginPath();
         this.overlayCtx.moveTo(...pixelLoc);
         this.overlayCtx.lineTo(...point);
         this.overlayCtx.stroke();
      }
   }

   selectSample(sample) {
      this.selectedSample = sample;
      if (sample && sample.nearestSamples) {
         this.nearestSamples = sample.nearestSamples;
      } else {
         this.nearestSamples = null;
      }
      this.#drawOverlay();
   }

   #emphasizeSample(sample, color = "white") {
      const pLoc = math.remapPoint(
         this.dataBounds,
         this.pixelBounds,
         sample.point
      );
      const grd = this.overlayCtx.createRadialGradient(
         ...pLoc,
         0,
         ...pLoc,
         this.margin
      );
      grd.addColorStop(0, color);
      grd.addColorStop(1, "rgba(255,255,255,0)");
      graphics.drawPoint(this.overlayCtx, pLoc, grd, this.margin * 2);
      this.#drawSamples([sample], this.overlayCtx);
   }

   #drawAxes(ctx) {
      const { canvas, axesLabels, margin } = this;
      const { left, right, top, bottom } = this.pixelBounds;

      ctx.clearRect(0, 0, this.canvas.width, margin);
      ctx.clearRect(0, 0, margin, this.canvas.height);
      ctx.clearRect(this.canvas.width - margin, 0, margin, this.canvas.height);
      ctx.clearRect(0, this.canvas.height - margin, this.canvas.width, margin);

      graphics.drawText(ctx, {
         text: axesLabels[0],
         loc: [canvas.width / 2, bottom + margin / 2],
         size: margin * 0.6,
      });

      ctx.save();
      ctx.translate(left - margin / 2, canvas.height / 2);
      ctx.rotate(-Math.PI / 2);
      graphics.drawText(ctx, {
         text: axesLabels[1],
         loc: [0, 0],
         size: margin * 0.6,
      });
      ctx.restore();

      ctx.beginPath();
      ctx.moveTo(left, top);
      ctx.lineTo(left, bottom);
      ctx.lineTo(right, bottom);
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "lightgray";
      ctx.stroke();
      ctx.setLineDash([]);

      const dataMin = math.remapPoint(this.pixelBounds, this.dataBounds, [
         left,
         bottom,
      ]);
      graphics.drawText(ctx, {
         text: math.formatNumber(dataMin[0], 2),
         loc: [left, bottom],
         size: margin * 0.3,
         align: "left",
         vAlign: "top",
      });
      ctx.save();
      ctx.translate(left, bottom);
      ctx.rotate(-Math.PI / 2);
      graphics.drawText(ctx, {
         text: math.formatNumber(dataMin[1], 2),
         loc: [0, 0],
         size: margin * 0.3,
         align: "left",
         vAlign: "bottom",
      });
      ctx.restore();

      const dataMax = math.remapPoint(this.pixelBounds, this.dataBounds, [
         right,
         top,
      ]);
      graphics.drawText(ctx, {
         text: math.formatNumber(dataMax[0], 2),
         loc: [right, bottom],
         size: margin * 0.3,
         align: "right",
         vAlign: "top",
      });
      ctx.save();
      ctx.translate(left, top);
      ctx.rotate(-Math.PI / 2);
      graphics.drawText(ctx, {
         text: math.formatNumber(dataMax[1], 2),
         loc: [0, 0],
         size: margin * 0.3,
         align: "right",
         vAlign: "bottom",
      });
      ctx.restore();
   }

   #drawSamples(samples, ctx) {
      if (this.hideSamples) {
         return;
      }
      const { dataBounds, pixelBounds } = this;
      for (const sample of samples) {
         let { point, truth, label } = sample;
         if (!truth) {
            truth = label;
         }
         const pixelLoc = math.remapPoint(dataBounds, pixelBounds, point);
         switch (this.icon) {
            case "image":
               graphics.drawImage(ctx, this.styles[truth].image, pixelLoc);
               break;
            case "text":
               graphics.drawText(ctx, {
                  text: this.styles[truth].text,
                  loc: pixelLoc,
                  size: 20,
               });
               break;
            default:
               graphics.drawPoint(ctx, pixelLoc, this.styles[truth].color);
               break;
         }
      }
   }
}
