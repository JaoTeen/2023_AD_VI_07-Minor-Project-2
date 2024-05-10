if (typeof utils === "undefined") {
   utils = require("./utils.js");
}

const geometry = {};

geometry.roundness = (polygon) => {
   const length = geometry.length(polygon);
   const area = geometry.area(polygon);
   const R = length / (Math.PI * 2);
   const circleArea = Math.PI * R ** 2;
   const roundness = area / circleArea;

   if (isNaN(roundness)) {
      return 0;
   }
   return roundness;
};

geometry.length = (polygon) => {
   let length = 0;
   for (let i = 0; i < polygon.length; i++) {
      const nextI = (i + 1) % polygon.length;
      length += utils.distance(polygon[i], polygon[nextI]);
   }
   return length;
};

geometry.area = (polygon) => {
   let area = 0;
   const A = polygon[0];
   for (let i = 1; i < polygon.length - 1; i++) {
      const B = polygon[i];
      const C = polygon[i + 1];
      area += geometry.triangleArea(A, B, C);
   }
   return area;
};

geometry.triangleArea = (A, B, C) => {
   const a = utils.distance(B, C);
   const b = utils.distance(A, C);
   const c = utils.distance(A, B);

   const p = (a + b + c) / 2;
   const area = Math.sqrt(p * (p - a) * (p - b) * (p - c));
   return area;
};

geometry.lowestPoint = (points) =>
   points.reduce((lowest, point) => {
      if (point[1] > lowest[1]) {
         return point;
      }
      if (point[1] === lowest[1] && point[0] < lowest[0]) {
         return point;
      }
      return lowest;
   });

geometry.sortPoints = (origin, points) =>
   points.slice().sort((a, b) => {
      const orientation = getOrientation(origin, a, b);
      if (orientation === 0) {
         return distanceSquared(origin, a) - distanceSquared(origin, b);
      }
      return -orientation;
   });

geometry.grahamScan = (points) => {
   const lowestPoint = geometry.lowestPoint(points);
   const sortedPoints = geometry.sortPoints(lowestPoint, points);

   const stack = [sortedPoints[0], sortedPoints[1], sortedPoints[2]];

   for (let i = 3; i < sortedPoints.length; i++) {
      let top = stack.length - 1;
      while (
         top > 0 &&
         getOrientation(stack[top - 1], stack[top], sortedPoints[i]) <= 0
      ) {
         stack.pop();
         top--;
      }
      stack.push(sortedPoints[i]);
   }

   return stack;
};

geometry.coincidentBox = (hull, i, j) => {
   const diff = (a, b) => [a[0] - b[0], a[1] - b[1]];
   const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
   const len = (a) => Math.sqrt(a[0] * a[0] + a[1] * a[1]);
   const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
   const mult = (a, n) => [a[0] * n, a[1] * n];
   const div = (a, n) => [a[0] / n, a[1] / n];
   const unit = (a) => div(a, len(a));

   let origin = hull[i];
   let baseX = unit(diff(hull[j], origin));
   let baseY = [baseX[1], -baseX[0]];

   let left = 0;
   let right = 0;
   let top = 0;
   let bottom = 0;
   for (const p of hull) {
      const n = [p[0] - origin[0], p[1] - origin[1]];
      const v = [dot(baseX, n), dot(baseY, n)];
      left = Math.min(v[0], left);
      top = Math.min(v[1], top);
      right = Math.max(v[0], right);
      bottom = Math.max(v[1], bottom);
   }

   const vertices = [
      add(add(mult(baseX, left), mult(baseY, top)), origin),
      add(add(mult(baseX, left), mult(baseY, bottom)), origin),
      add(add(mult(baseX, right), mult(baseY, bottom)), origin),
      add(add(mult(baseX, right), mult(baseY, top)), origin),
   ];

   return {
      vertices,
      width: right - left,
      height: bottom - top,
   };
};

geometry.minimumBoundingBox = ({ points, hull }) => {
   if (points.length < 3) {
      return {
         width: 0,
         height: 0,
         vertices: points,
         hull: points
      };
   }
   hull = hull || geometry.grahamScan(points);

   let minArea = Number.MAX_VALUE;
   let result = null;
   for (let i = 0; i < hull.length; ++i) {
      const { vertices, width, height } = geometry.coincidentBox(
         hull,
         i,
         (i + 1) % hull.length
      );
      const area = width * height;
      if (area < minArea) {
         minArea = area;
         result = { vertices, width, height, hull };
      }
   }
   return result;
};

function getOrientation(p1, p2, p3) {
   const val =
      (p2[1] - p1[1]) * (p3[0] - p2[0]) - (p2[0] - p1[0]) * (p3[1] - p2[1]);
   if (val === 0) {
      return 0;
   }
   return val > 0 ? 1 : -1;
}

function distanceSquared(p1, p2) {
   const dx = p2[0] - p1[0];
   const dy = p2[1] - p1[1];
   return dx * dx + dy * dy;
}

if (typeof module !== "undefined") {
   module.exports = geometry;
}
