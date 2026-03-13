interface EditorialMarkdownProps {
  markdown: string;
}

function renderBlock(block: string, index: number) {
  if (block.startsWith("### ")) {
    return <h3 key={index} className="mt-8 text-xl font-semibold text-neutral-900">{block.replace("### ", "")}</h3>;
  }

  if (block.startsWith("## ")) {
    return <h2 key={index} className="mt-10 text-2xl font-bold text-neutral-900">{block.replace("## ", "")}</h2>;
  }

  if (block.startsWith("- ")) {
    const items = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.replace(/^- /, ""));

    return (
      <ul key={index} className="mt-4 list-disc space-y-2 pl-6 text-neutral-700">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }

  return <p key={index} className="mt-4 text-base leading-8 text-neutral-700">{block}</p>;
}

export default function EditorialMarkdown({ markdown }: EditorialMarkdownProps) {
  const blocks = markdown
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return <div>{blocks.map((block, index) => renderBlock(block, index))}</div>;
}
