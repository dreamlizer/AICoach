"use client";

export function downloadChartImage(chart: any) {
  if (!chart) return false;

  const image = chart.getDataURL({
    type: "png",
    pixelRatio: 2,
    backgroundColor: "#ffffff"
  });

  const link = document.createElement("a");
  link.href = image;
  const now = new Date();
  const timestamp =
    now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, "0") +
    now.getDate().toString().padStart(2, "0") +
    now.getHours().toString().padStart(2, "0") +
    now.getMinutes().toString().padStart(2, "0");
  link.download = `超级地图(${timestamp}).png`;
  link.click();
  return true;
}
