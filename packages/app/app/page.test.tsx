import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import Home from "./page";
import RootLayout from "./layout";

vi.mock("next/image", async () => {
  const { createElement: createReactElement } = await import("react");

  return {
    default: (
      props: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean },
    ) => {
      const imageProps = { ...props };
      delete imageProps.priority;
      return createReactElement("img", imageProps);
    },
  };
});

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "font-geist-sans" }),
  Geist_Mono: () => ({ variable: "font-geist-mono" }),
}));

describe("home page", () => {
  it("renders the starter content and primary links", () => {
    const markup = renderToStaticMarkup(createElement(Home));

    expect(markup).toContain("<h1");
    expect(markup).toContain("To get started, edit the");
    expect(markup).toContain('alt="Next.js logo"');
    expect(markup).toContain('href="https://vercel.com/new?');
    expect(markup).toContain('href="https://nextjs.org/docs?');
  });
});

describe("root layout", () => {
  it("renders document metadata styles around its page content", () => {
    const markup = renderToStaticMarkup(
      createElement(RootLayout, null, createElement("main", null, "Test page")),
    );

    expect(markup).toContain('<html lang="en"');
    expect(markup).toContain("font-geist-sans");
    expect(markup).toContain("font-geist-mono");
    expect(markup).toContain("<main>Test page</main>");
    expect(markup).toContain("min-h-full flex flex-col");
  });
});
