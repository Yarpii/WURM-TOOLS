interface JsonLdProps {
  data: object | object[];
}

/**
 * Serialize a JSON-LD schema safely for inline use inside a <script> tag.
 * JSON.stringify can emit </script> which would close the enclosing tag;
 * we replace < > & with Unicode escapes to prevent script-tag injection.
 */
function safeJsonLd(schema: object): string {
  return JSON.stringify(schema)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

/**
 * Component to render JSON-LD structured data
 * Can accept a single schema object or an array of schemas
 */
export default function JsonLd({ data }: JsonLdProps) {
  const schemas = Array.isArray(data) ? data : [data];

  return (
    <>
      {schemas.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLd(schema),
          }}
        />
      ))}
    </>
  );
}
