const isServerModule = (source) =>
  /(^|[\\/])server([\\/]|$)/.test(source) ||
  source === "@/server" ||
  source.startsWith("@/server/");

/**
 * Client components must never import server-only modules.
 * Any file that opens with a "use client" directive may not import from
 * `src/server/**` (via relative or `@/server` specifiers), statically or
 * dynamically, or re-export it.
 */
export const noServerImportsInClient = {
  meta: {
    type: "problem",
    docs: {
      description:
        "forbid 'use client' modules from importing src/server/** code",
    },
    messages: {
      serverImport:
        "'use client' modules cannot import from src/server ('{{source}}'). Move the import to a Server Component or pass data in via props.",
    },
    schema: [],
  },
  create(context) {
    const firstStatement = context.sourceCode.ast.body[0];
    const isClient =
      firstStatement?.type === "ExpressionStatement" &&
      firstStatement.expression.type === "Literal" &&
      firstStatement.expression.value === "use client";

    if (!isClient) return {};

    return {
      ImportDeclaration(node) {
        if (isServerModule(node.source.value)) {
          context.report({
            node,
            messageId: "serverImport",
            data: { source: node.source.value },
          });
        }
      },
      ExportNamedDeclaration(node) {
        if (node.source && isServerModule(node.source.value)) {
          context.report({
            node,
            messageId: "serverImport",
            data: { source: node.source.value },
          });
        }
      },
      ImportExpression(node) {
        if (
          node.source?.type === "Literal" &&
          typeof node.source.value === "string" &&
          isServerModule(node.source.value)
        ) {
          context.report({
            node,
            messageId: "serverImport",
            data: { source: node.source.value },
          });
        }
      },
    };
  },
};
