import ReactMarkdown from "react-markdown";

export default function TournamentDescription({
  content,
}: {
  content: string;
}) {
  return (
    <article
      className="   prose
     prose-neutral
     max-w-none
     prose-h2:mt-12
     prose-h2:mb-4
     prose-hr:my-10
     prose-ul:my-4
     prose-p:my-4"
    >
      <ReactMarkdown
        components={{
          hr: () => <hr className="my-4 border-muted" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
