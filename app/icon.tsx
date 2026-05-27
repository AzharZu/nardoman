import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, #f7f1e3 0%, #dfeccd 100%)"
        }}
      >
        <div
          style={{
            width: 124,
            height: 124,
            borderRadius: 36,
            background: "linear-gradient(180deg, #6fae57 0%, #87c26c 100%)",
            boxShadow: "0 18px 50px rgba(79, 110, 67, 0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <div
            style={{
              width: 74,
              height: 74,
              borderRadius: 28,
              background: "rgba(255,255,255,0.86)",
              color: "#4f6542",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 52,
              fontWeight: 700,
              lineHeight: 1
            }}
          >
            ✦
          </div>
        </div>
      </div>
    ),
    size
  );
}
