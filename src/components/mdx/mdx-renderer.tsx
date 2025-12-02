interface MdxRenderedProps {
  mdxSourceString: string;
}

export function MdxRendered({ mdxSourceString }: MdxRenderedProps) {
  return (
    <div
      className="prose max-w-none"
      dangerouslySetInnerHTML={{ __html: mdxSourceString }}
    />
  );
}
