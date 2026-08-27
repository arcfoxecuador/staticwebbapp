// ⚠️  ARCHIVO GENERADO — NO EDITAR A MANO.
// Generado por astro-web/scripts/gen-cms-manifest.ts a partir de
// astro-web/src/content/blocks.ts y career.ts (la fuente de verdad del esquema).
// Para actualizarlo:  cd astro-web && npm run codegen
//
// El panel deriva su catálogo y sus formularios de estos datos + la capa de
// presentación en cms-panel/src/lib/presentation.ts.

export type ManifestKind =
  | "string"
  | "number"
  | "boolean"
  | "enum"
  | "cta"
  | "stringlist"
  | "array"
  | "object"
  | "unknown";

export interface ManifestVariant {
  value: string;
  fields: ManifestField[];
}

export interface ManifestField {
  name: string;
  kind: ManifestKind;
  required: boolean;
  options?: string[];
  numeric?: boolean;
  item?: ManifestField[];
  variantKey?: string;
  variants?: ManifestVariant[];
}

export interface BlockManifest {
  type: string;
  fields: ManifestField[];
}

export interface ContentEntry {
  slug: string;
  label: string;
}

export const BLOCK_MANIFEST: BlockManifest[] = [
  {
    "type": "hero",
    "fields": [
      {
        "name": "hidden",
        "kind": "boolean",
        "required": false
      },
      {
        "name": "anchor",
        "kind": "string",
        "required": false
      },
      {
        "name": "variant",
        "kind": "enum",
        "required": false,
        "options": [
          "brand",
          "light"
        ]
      },
      {
        "name": "background",
        "kind": "enum",
        "required": false,
        "options": [
          "brand",
          "dark"
        ]
      },
      {
        "name": "align",
        "kind": "enum",
        "required": false,
        "options": [
          "left",
          "center"
        ]
      },
      {
        "name": "eyebrow",
        "kind": "string",
        "required": false
      },
      {
        "name": "heading",
        "kind": "string",
        "required": true
      },
      {
        "name": "description",
        "kind": "string",
        "required": false
      },
      {
        "name": "primaryCta",
        "kind": "cta",
        "required": false
      },
      {
        "name": "secondaryCta",
        "kind": "cta",
        "required": false
      },
      {
        "name": "image",
        "kind": "string",
        "required": false
      },
      {
        "name": "imageAlt",
        "kind": "string",
        "required": false
      },
      {
        "name": "videoUrl",
        "kind": "string",
        "required": false
      },
      {
        "name": "heroVideo",
        "kind": "string",
        "required": false
      },
      {
        "name": "heroVideoPoster",
        "kind": "string",
        "required": false
      },
      {
        "name": "showSeal",
        "kind": "boolean",
        "required": false
      },
      {
        "name": "intakeBadge",
        "kind": "boolean",
        "required": false
      },
      {
        "name": "intakeBadgeLabel",
        "kind": "string",
        "required": false
      },
      {
        "name": "imageSide",
        "kind": "enum",
        "required": false,
        "options": [
          "left",
          "right"
        ]
      }
    ]
  },
  {
    "type": "richContent",
    "fields": [
      {
        "name": "hidden",
        "kind": "boolean",
        "required": false
      },
      {
        "name": "anchor",
        "kind": "string",
        "required": false
      },
      {
        "name": "background",
        "kind": "enum",
        "required": false,
        "options": [
          "light",
          "tint",
          "brand",
          "dark"
        ]
      },
      {
        "name": "width",
        "kind": "enum",
        "required": false,
        "options": [
          "normal",
          "wide"
        ]
      },
      {
        "name": "align",
        "kind": "enum",
        "required": false,
        "options": [
          "left",
          "center"
        ]
      },
      {
        "name": "items",
        "kind": "array",
        "required": false,
        "variantKey": "kind",
        "variants": [
          {
            "value": "heading",
            "fields": [
              {
                "name": "text",
                "kind": "string",
                "required": true
              },
              {
                "name": "level",
                "kind": "enum",
                "required": false,
                "options": [
                  "h2",
                  "h3"
                ]
              }
            ]
          },
          {
            "value": "text",
            "fields": [
              {
                "name": "text",
                "kind": "string",
                "required": true
              }
            ]
          },
          {
            "value": "image",
            "fields": [
              {
                "name": "src",
                "kind": "string",
                "required": true
              },
              {
                "name": "alt",
                "kind": "string",
                "required": false
              },
              {
                "name": "width",
                "kind": "enum",
                "required": false,
                "options": [
                  "full",
                  "wide",
                  "medium"
                ]
              }
            ]
          },
          {
            "value": "button",
            "fields": [
              {
                "name": "label",
                "kind": "string",
                "required": true
              },
              {
                "name": "href",
                "kind": "string",
                "required": true
              },
              {
                "name": "style",
                "kind": "enum",
                "required": false,
                "options": [
                  "primary",
                  "secondary"
                ]
              }
            ]
          },
          {
            "value": "buttons",
            "fields": [
              {
                "name": "items",
                "kind": "array",
                "required": false,
                "item": [
                  {
                    "name": "label",
                    "kind": "string",
                    "required": true
                  },
                  {
                    "name": "href",
                    "kind": "string",
                    "required": true
                  }
                ]
              }
            ]
          },
          {
            "value": "list",
            "fields": [
              {
                "name": "items",
                "kind": "stringlist",
                "required": false
              },
              {
                "name": "ordered",
                "kind": "boolean",
                "required": false
              }
            ]
          },
          {
            "value": "spacer",
            "fields": [
              {
                "name": "size",
                "kind": "enum",
                "required": false,
                "options": [
                  "sm",
                  "md",
                  "lg"
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "type": "stats",
    "fields": [
      {
        "name": "hidden",
        "kind": "boolean",
        "required": false
      },
      {
        "name": "anchor",
        "kind": "string",
        "required": false
      },
      {
        "name": "columns",
        "kind": "enum",
        "required": false,
        "options": [
          "auto",
          "2",
          "3",
          "4",
          "5",
          "6"
        ],
        "numeric": false
      },
      {
        "name": "overlap",
        "kind": "boolean",
        "required": false
      },
      {
        "name": "highlightLabel",
        "kind": "string",
        "required": false
      },
      {
        "name": "highlightValue",
        "kind": "string",
        "required": false
      },
      {
        "name": "items",
        "kind": "array",
        "required": true,
        "item": [
          {
            "name": "value",
            "kind": "string",
            "required": true
          },
          {
            "name": "label",
            "kind": "string",
            "required": true
          }
        ]
      }
    ]
  },
  {
    "type": "richTextSplit",
    "fields": [
      {
        "name": "hidden",
        "kind": "boolean",
        "required": false
      },
      {
        "name": "anchor",
        "kind": "string",
        "required": false
      },
      {
        "name": "eyebrow",
        "kind": "string",
        "required": false
      },
      {
        "name": "heading",
        "kind": "string",
        "required": true
      },
      {
        "name": "body",
        "kind": "string",
        "required": true
      },
      {
        "name": "cta",
        "kind": "cta",
        "required": false
      },
      {
        "name": "imagePrimary",
        "kind": "string",
        "required": false
      },
      {
        "name": "imageAlt",
        "kind": "string",
        "required": false
      },
      {
        "name": "imageSide",
        "kind": "enum",
        "required": false,
        "options": [
          "left",
          "right"
        ]
      }
    ]
  },
  {
    "type": "careerShowcase",
    "fields": [
      {
        "name": "hidden",
        "kind": "boolean",
        "required": false
      },
      {
        "name": "anchor",
        "kind": "string",
        "required": false
      },
      {
        "name": "eyebrow",
        "kind": "string",
        "required": false
      },
      {
        "name": "heading",
        "kind": "string",
        "required": false
      },
      {
        "name": "description",
        "kind": "string",
        "required": false
      },
      {
        "name": "layout",
        "kind": "enum",
        "required": false,
        "options": [
          "carousel",
          "grid"
        ]
      },
      {
        "name": "modalidad",
        "kind": "enum",
        "required": false,
        "options": [
          "todas",
          "En línea",
          "Dual",
          "Híbrida"
        ]
      },
      {
        "name": "tabs",
        "kind": "array",
        "required": false,
        "item": [
          {
            "name": "label",
            "kind": "string",
            "required": true
          },
          {
            "name": "modalidades",
            "kind": "stringlist",
            "required": false,
            "options": [
              "En línea",
              "Dual",
              "Híbrida"
            ]
          },
          {
            "name": "extras",
            "kind": "array",
            "required": false,
            "item": [
              {
                "name": "title",
                "kind": "string",
                "required": true
              },
              {
                "name": "href",
                "kind": "string",
                "required": true
              },
              {
                "name": "image",
                "kind": "string",
                "required": false
              },
              {
                "name": "tag",
                "kind": "string",
                "required": false
              }
            ]
          }
        ]
      },
      {
        "name": "viewAllCta",
        "kind": "cta",
        "required": false
      }
    ]
  },
  {
    "type": "featureGrid",
    "fields": [
      {
        "name": "hidden",
        "kind": "boolean",
        "required": false
      },
      {
        "name": "anchor",
        "kind": "string",
        "required": false
      },
      {
        "name": "variant",
        "kind": "enum",
        "required": false,
        "options": [
          "light",
          "dark"
        ]
      },
      {
        "name": "style",
        "kind": "enum",
        "required": false,
        "options": [
          "plain",
          "numbered",
          "card",
          "accordion"
        ]
      },
      {
        "name": "align",
        "kind": "enum",
        "required": false,
        "options": [
          "center",
          "left"
        ]
      },
      {
        "name": "headingAlign",
        "kind": "enum",
        "required": false,
        "options": [
          "center",
          "left"
        ]
      },
      {
        "name": "eyebrow",
        "kind": "string",
        "required": false
      },
      {
        "name": "heading",
        "kind": "string",
        "required": false
      },
      {
        "name": "description",
        "kind": "string",
        "required": false
      },
      {
        "name": "image",
        "kind": "string",
        "required": false
      },
      {
        "name": "imageAlt",
        "kind": "string",
        "required": false
      },
      {
        "name": "imageWidth",
        "kind": "number",
        "required": false
      },
      {
        "name": "imageHeight",
        "kind": "number",
        "required": false
      },
      {
        "name": "imageLayout",
        "kind": "enum",
        "required": false,
        "options": [
          "stacked",
          "side"
        ]
      },
      {
        "name": "imageSide",
        "kind": "enum",
        "required": false,
        "options": [
          "left",
          "right"
        ]
      },
      {
        "name": "footnote",
        "kind": "string",
        "required": false
      },
      {
        "name": "actions",
        "kind": "array",
        "required": false,
        "item": [
          {
            "name": "label",
            "kind": "string",
            "required": true
          },
          {
            "name": "href",
            "kind": "string",
            "required": true
          }
        ]
      },
      {
        "name": "columns",
        "kind": "enum",
        "required": false,
        "options": [
          "2",
          "3",
          "4"
        ],
        "numeric": true
      },
      {
        "name": "items",
        "kind": "array",
        "required": true,
        "item": [
          {
            "name": "icon",
            "kind": "string",
            "required": false
          },
          {
            "name": "image",
            "kind": "string",
            "required": false
          },
          {
            "name": "imageAlt",
            "kind": "string",
            "required": false
          },
          {
            "name": "eyebrow",
            "kind": "string",
            "required": false
          },
          {
            "name": "title",
            "kind": "string",
            "required": true
          },
          {
            "name": "description",
            "kind": "string",
            "required": false
          },
          {
            "name": "href",
            "kind": "string",
            "required": false
          }
        ]
      }
    ]
  },
  {
    "type": "newsGrid",
    "fields": [
      {
        "name": "hidden",
        "kind": "boolean",
        "required": false
      },
      {
        "name": "anchor",
        "kind": "string",
        "required": false
      },
      {
        "name": "readMoreLabel",
        "kind": "string",
        "required": false
      },
      {
        "name": "eyebrow",
        "kind": "string",
        "required": false
      },
      {
        "name": "heading",
        "kind": "string",
        "required": false
      },
      {
        "name": "limit",
        "kind": "number",
        "required": false
      },
      {
        "name": "showFeatured",
        "kind": "boolean",
        "required": false
      },
      {
        "name": "categories",
        "kind": "stringlist",
        "required": false
      },
      {
        "name": "viewAllCta",
        "kind": "cta",
        "required": false
      }
    ]
  },
  {
    "type": "admissionsCallout",
    "fields": [
      {
        "name": "hidden",
        "kind": "boolean",
        "required": false
      },
      {
        "name": "anchor",
        "kind": "string",
        "required": false
      },
      {
        "name": "eyebrow",
        "kind": "string",
        "required": false
      },
      {
        "name": "heading",
        "kind": "string",
        "required": true
      },
      {
        "name": "body",
        "kind": "string",
        "required": false
      },
      {
        "name": "highlightLabel",
        "kind": "string",
        "required": false
      },
      {
        "name": "highlightValue",
        "kind": "string",
        "required": false
      },
      {
        "name": "requirements",
        "kind": "stringlist",
        "required": false
      },
      {
        "name": "primaryCta",
        "kind": "cta",
        "required": false
      },
      {
        "name": "secondaryCta",
        "kind": "cta",
        "required": false
      },
      {
        "name": "steps",
        "kind": "array",
        "required": true,
        "item": [
          {
            "name": "title",
            "kind": "string",
            "required": true
          },
          {
            "name": "description",
            "kind": "string",
            "required": true
          }
        ]
      }
    ]
  },
  {
    "type": "leadForm",
    "fields": [
      {
        "name": "hidden",
        "kind": "boolean",
        "required": false
      },
      {
        "name": "anchor",
        "kind": "string",
        "required": false
      },
      {
        "name": "eyebrow",
        "kind": "string",
        "required": false
      },
      {
        "name": "heading",
        "kind": "string",
        "required": false
      },
      {
        "name": "description",
        "kind": "string",
        "required": false
      },
      {
        "name": "bullets",
        "kind": "stringlist",
        "required": false
      },
      {
        "name": "phoneCtaLabel",
        "kind": "string",
        "required": false
      },
      {
        "name": "whatsappCtaLabel",
        "kind": "string",
        "required": false
      },
      {
        "name": "nameStep",
        "kind": "object",
        "required": false,
        "item": [
          {
            "name": "question",
            "kind": "string",
            "required": true
          },
          {
            "name": "hint",
            "kind": "string",
            "required": false
          },
          {
            "name": "placeholder",
            "kind": "string",
            "required": false
          }
        ]
      },
      {
        "name": "birthStep",
        "kind": "object",
        "required": false,
        "item": [
          {
            "name": "question",
            "kind": "string",
            "required": true
          },
          {
            "name": "hint",
            "kind": "string",
            "required": false
          },
          {
            "name": "placeholder",
            "kind": "string",
            "required": false
          },
          {
            "name": "error",
            "kind": "string",
            "required": false
          }
        ]
      },
      {
        "name": "guardian",
        "kind": "object",
        "required": false,
        "item": [
          {
            "name": "title",
            "kind": "string",
            "required": false
          },
          {
            "name": "description",
            "kind": "string",
            "required": false
          },
          {
            "name": "placeholder",
            "kind": "string",
            "required": false
          },
          {
            "name": "consentLabel",
            "kind": "string",
            "required": false
          },
          {
            "name": "error",
            "kind": "string",
            "required": false
          }
        ]
      },
      {
        "name": "phoneStep",
        "kind": "object",
        "required": false,
        "item": [
          {
            "name": "question",
            "kind": "string",
            "required": true
          },
          {
            "name": "hint",
            "kind": "string",
            "required": false
          },
          {
            "name": "placeholder",
            "kind": "string",
            "required": false
          }
        ]
      },
      {
        "name": "careerStep",
        "kind": "object",
        "required": false,
        "item": [
          {
            "name": "question",
            "kind": "string",
            "required": true
          },
          {
            "name": "hint",
            "kind": "string",
            "required": false
          },
          {
            "name": "placeholder",
            "kind": "string",
            "required": false
          }
        ]
      },
      {
        "name": "timingStep",
        "kind": "object",
        "required": false,
        "item": [
          {
            "name": "question",
            "kind": "string",
            "required": true
          },
          {
            "name": "hint",
            "kind": "string",
            "required": false
          },
          {
            "name": "placeholder",
            "kind": "string",
            "required": false
          }
        ]
      },
      {
        "name": "timingOptions",
        "kind": "stringlist",
        "required": false
      },
      {
        "name": "submitLabel",
        "kind": "string",
        "required": false
      },
      {
        "name": "nextLabel",
        "kind": "string",
        "required": false
      },
      {
        "name": "stepLabel",
        "kind": "string",
        "required": false
      },
      {
        "name": "fallbackName",
        "kind": "string",
        "required": false
      },
      {
        "name": "backLabel",
        "kind": "string",
        "required": false
      },
      {
        "name": "consent",
        "kind": "object",
        "required": false,
        "item": [
          {
            "name": "label",
            "kind": "string",
            "required": false
          },
          {
            "name": "linkLabel",
            "kind": "string",
            "required": false
          },
          {
            "name": "href",
            "kind": "string",
            "required": false
          },
          {
            "name": "error",
            "kind": "string",
            "required": false
          }
        ]
      },
      {
        "name": "success",
        "kind": "object",
        "required": false,
        "item": [
          {
            "name": "heading",
            "kind": "string",
            "required": false
          },
          {
            "name": "description",
            "kind": "string",
            "required": false
          },
          {
            "name": "whatsappLabel",
            "kind": "string",
            "required": false
          },
          {
            "name": "phoneLabel",
            "kind": "string",
            "required": false
          }
        ]
      }
    ]
  },
  {
    "type": "dualLeadForm",
    "fields": [
      {
        "name": "hidden",
        "kind": "boolean",
        "required": false
      },
      {
        "name": "anchor",
        "kind": "string",
        "required": false
      },
      {
        "name": "eyebrow",
        "kind": "string",
        "required": false
      },
      {
        "name": "heading",
        "kind": "string",
        "required": true
      },
      {
        "name": "description",
        "kind": "string",
        "required": false
      },
      {
        "name": "note",
        "kind": "string",
        "required": false
      },
      {
        "name": "successHeading",
        "kind": "string",
        "required": false
      },
      {
        "name": "successText",
        "kind": "string",
        "required": false
      },
      {
        "name": "successWhatsappCta",
        "kind": "string",
        "required": false
      },
      {
        "name": "successPhoneCta",
        "kind": "string",
        "required": false
      },
      {
        "name": "fallbackName",
        "kind": "string",
        "required": false
      },
      {
        "name": "consent",
        "kind": "object",
        "required": false,
        "item": [
          {
            "name": "label",
            "kind": "string",
            "required": false
          },
          {
            "name": "linkLabel",
            "kind": "string",
            "required": false
          },
          {
            "name": "href",
            "kind": "string",
            "required": false
          },
          {
            "name": "error",
            "kind": "string",
            "required": false
          }
        ]
      },
      {
        "name": "productor",
        "kind": "object",
        "required": true,
        "item": [
          {
            "name": "tabLabel",
            "kind": "string",
            "required": true
          },
          {
            "name": "title",
            "kind": "string",
            "required": true
          },
          {
            "name": "description",
            "kind": "string",
            "required": false
          },
          {
            "name": "submitLabel",
            "kind": "string",
            "required": false
          },
          {
            "name": "labels",
            "kind": "unknown",
            "required": false
          }
        ]
      },
      {
        "name": "empresa",
        "kind": "object",
        "required": true,
        "item": [
          {
            "name": "tabLabel",
            "kind": "string",
            "required": true
          },
          {
            "name": "title",
            "kind": "string",
            "required": true
          },
          {
            "name": "description",
            "kind": "string",
            "required": false
          },
          {
            "name": "submitLabel",
            "kind": "string",
            "required": false
          },
          {
            "name": "labels",
            "kind": "unknown",
            "required": false
          }
        ]
      },
      {
        "name": "provinces",
        "kind": "stringlist",
        "required": false
      }
    ]
  },
  {
    "type": "faq",
    "fields": [
      {
        "name": "hidden",
        "kind": "boolean",
        "required": false
      },
      {
        "name": "anchor",
        "kind": "string",
        "required": false
      },
      {
        "name": "eyebrow",
        "kind": "string",
        "required": false
      },
      {
        "name": "heading",
        "kind": "string",
        "required": false
      },
      {
        "name": "items",
        "kind": "array",
        "required": true,
        "item": [
          {
            "name": "question",
            "kind": "string",
            "required": true
          },
          {
            "name": "answer",
            "kind": "string",
            "required": true
          }
        ]
      }
    ]
  },
  {
    "type": "stepsProcess",
    "fields": [
      {
        "name": "hidden",
        "kind": "boolean",
        "required": false
      },
      {
        "name": "anchor",
        "kind": "string",
        "required": false
      },
      {
        "name": "style",
        "kind": "enum",
        "required": false,
        "options": [
          "cards",
          "bordered"
        ]
      },
      {
        "name": "align",
        "kind": "enum",
        "required": false,
        "options": [
          "center",
          "left"
        ]
      },
      {
        "name": "eyebrow",
        "kind": "string",
        "required": false
      },
      {
        "name": "heading",
        "kind": "string",
        "required": false
      },
      {
        "name": "columns",
        "kind": "enum",
        "required": false,
        "options": [
          "2",
          "3",
          "4",
          "5",
          "6"
        ],
        "numeric": true
      },
      {
        "name": "steps",
        "kind": "array",
        "required": true,
        "item": [
          {
            "name": "title",
            "kind": "string",
            "required": false
          },
          {
            "name": "description",
            "kind": "string",
            "required": true
          }
        ]
      }
    ]
  },
  {
    "type": "ctaBanner",
    "fields": [
      {
        "name": "hidden",
        "kind": "boolean",
        "required": false
      },
      {
        "name": "anchor",
        "kind": "string",
        "required": false
      },
      {
        "name": "background",
        "kind": "enum",
        "required": false,
        "options": [
          "brand",
          "dark",
          "light"
        ]
      },
      {
        "name": "backgroundImage",
        "kind": "string",
        "required": false
      },
      {
        "name": "heading",
        "kind": "string",
        "required": true
      },
      {
        "name": "description",
        "kind": "string",
        "required": false
      },
      {
        "name": "primaryCta",
        "kind": "cta",
        "required": false
      },
      {
        "name": "secondaryCta",
        "kind": "cta",
        "required": false
      }
    ]
  },
  {
    "type": "highlightCards",
    "fields": [
      {
        "name": "hidden",
        "kind": "boolean",
        "required": false
      },
      {
        "name": "anchor",
        "kind": "string",
        "required": false
      },
      {
        "name": "eyebrow",
        "kind": "string",
        "required": false
      },
      {
        "name": "heading",
        "kind": "string",
        "required": false
      },
      {
        "name": "description",
        "kind": "string",
        "required": false
      },
      {
        "name": "columns",
        "kind": "enum",
        "required": false,
        "options": [
          "2",
          "3",
          "4"
        ],
        "numeric": true
      },
      {
        "name": "items",
        "kind": "array",
        "required": true,
        "item": [
          {
            "name": "variant",
            "kind": "enum",
            "required": false,
            "options": [
              "cloud",
              "brand"
            ]
          },
          {
            "name": "eyebrow",
            "kind": "string",
            "required": false
          },
          {
            "name": "title",
            "kind": "string",
            "required": true
          },
          {
            "name": "body",
            "kind": "string",
            "required": false
          }
        ]
      }
    ]
  },
  {
    "type": "pricingGrid",
    "fields": [
      {
        "name": "hidden",
        "kind": "boolean",
        "required": false
      },
      {
        "name": "anchor",
        "kind": "string",
        "required": false
      },
      {
        "name": "eyebrow",
        "kind": "string",
        "required": false
      },
      {
        "name": "heading",
        "kind": "string",
        "required": false
      },
      {
        "name": "placeholder",
        "kind": "string",
        "required": false
      },
      {
        "name": "periodoLabel",
        "kind": "string",
        "required": false
      },
      {
        "name": "totalLabel",
        "kind": "string",
        "required": false
      },
      {
        "name": "placeholderNote",
        "kind": "string",
        "required": false
      },
      {
        "name": "note",
        "kind": "string",
        "required": false
      }
    ]
  },
  {
    "type": "featureList",
    "fields": [
      {
        "name": "hidden",
        "kind": "boolean",
        "required": false
      },
      {
        "name": "anchor",
        "kind": "string",
        "required": false
      },
      {
        "name": "eyebrow",
        "kind": "string",
        "required": false
      },
      {
        "name": "heading",
        "kind": "string",
        "required": false
      },
      {
        "name": "rows",
        "kind": "array",
        "required": true,
        "item": [
          {
            "name": "concept",
            "kind": "string",
            "required": true
          },
          {
            "name": "value",
            "kind": "string",
            "required": true
          },
          {
            "name": "hint",
            "kind": "string",
            "required": false
          },
          {
            "name": "group",
            "kind": "string",
            "required": false
          }
        ]
      },
      {
        "name": "note",
        "kind": "string",
        "required": false
      }
    ]
  },
  {
    "type": "accountabilityTabs",
    "fields": [
      {
        "name": "hidden",
        "kind": "boolean",
        "required": false
      },
      {
        "name": "anchor",
        "kind": "string",
        "required": false
      },
      {
        "name": "pendingLabel",
        "kind": "string",
        "required": false
      },
      {
        "name": "eyebrow",
        "kind": "string",
        "required": false
      },
      {
        "name": "heading",
        "kind": "string",
        "required": false
      },
      {
        "name": "description",
        "kind": "string",
        "required": false
      },
      {
        "name": "periods",
        "kind": "array",
        "required": true,
        "item": [
          {
            "name": "year",
            "kind": "string",
            "required": true
          },
          {
            "name": "phases",
            "kind": "array",
            "required": true,
            "item": [
              {
                "name": "number",
                "kind": "string",
                "required": true
              },
              {
                "name": "title",
                "kind": "string",
                "required": true
              },
              {
                "name": "description",
                "kind": "string",
                "required": true
              },
              {
                "name": "docs",
                "kind": "array",
                "required": false,
                "item": [
                  {
                    "name": "title",
                    "kind": "string",
                    "required": true
                  },
                  {
                    "name": "href",
                    "kind": "string",
                    "required": false
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "type": "audiences",
    "fields": [
      {
        "name": "hidden",
        "kind": "boolean",
        "required": false
      },
      {
        "name": "anchor",
        "kind": "string",
        "required": false
      },
      {
        "name": "columns",
        "kind": "enum",
        "required": false,
        "options": [
          "2",
          "3",
          "4"
        ],
        "numeric": true
      },
      {
        "name": "eyebrow",
        "kind": "string",
        "required": false
      },
      {
        "name": "heading",
        "kind": "string",
        "required": false
      },
      {
        "name": "description",
        "kind": "string",
        "required": false
      },
      {
        "name": "items",
        "kind": "array",
        "required": true,
        "item": [
          {
            "name": "image",
            "kind": "string",
            "required": true
          },
          {
            "name": "imageAlt",
            "kind": "string",
            "required": false
          },
          {
            "name": "title",
            "kind": "string",
            "required": true
          },
          {
            "name": "description",
            "kind": "string",
            "required": false
          },
          {
            "name": "cta",
            "kind": "cta",
            "required": false
          }
        ]
      }
    ]
  },
  {
    "type": "testimonials",
    "fields": [
      {
        "name": "hidden",
        "kind": "boolean",
        "required": false
      },
      {
        "name": "anchor",
        "kind": "string",
        "required": false
      },
      {
        "name": "columns",
        "kind": "enum",
        "required": false,
        "options": [
          "2",
          "3",
          "4"
        ],
        "numeric": true
      },
      {
        "name": "eyebrow",
        "kind": "string",
        "required": false
      },
      {
        "name": "heading",
        "kind": "string",
        "required": false
      },
      {
        "name": "description",
        "kind": "string",
        "required": false
      },
      {
        "name": "items",
        "kind": "array",
        "required": true,
        "item": [
          {
            "name": "image",
            "kind": "string",
            "required": false
          },
          {
            "name": "quote",
            "kind": "string",
            "required": true
          },
          {
            "name": "name",
            "kind": "string",
            "required": true
          },
          {
            "name": "role",
            "kind": "string",
            "required": false
          }
        ]
      }
    ]
  }
];

export const CAREER_MANIFEST: ManifestField[] = [
  {
    "name": "slug",
    "kind": "string",
    "required": true
  },
  {
    "name": "title",
    "kind": "string",
    "required": true
  },
  {
    "name": "hidden",
    "kind": "boolean",
    "required": false
  },
  {
    "name": "proximamente",
    "kind": "boolean",
    "required": false
  },
  {
    "name": "tag",
    "kind": "string",
    "required": true
  },
  {
    "name": "img",
    "kind": "string",
    "required": true
  },
  {
    "name": "banner",
    "kind": "string",
    "required": false
  },
  {
    "name": "modalidad",
    "kind": "enum",
    "required": false,
    "options": [
      "En línea",
      "Dual",
      "Híbrida"
    ]
  },
  {
    "name": "mallaPdf",
    "kind": "string",
    "required": false
  },
  {
    "name": "desc",
    "kind": "string",
    "required": true
  },
  {
    "name": "tagline",
    "kind": "string",
    "required": false
  },
  {
    "name": "titulo",
    "kind": "string",
    "required": true
  },
  {
    "name": "nivel",
    "kind": "string",
    "required": true
  },
  {
    "name": "resolucion",
    "kind": "string",
    "required": true
  },
  {
    "name": "duracion",
    "kind": "string",
    "required": true
  },
  {
    "name": "creditos",
    "kind": "string",
    "required": true
  },
  {
    "name": "asignaturas",
    "kind": "number",
    "required": false
  },
  {
    "name": "inicio",
    "kind": "string",
    "required": false
  },
  {
    "name": "dual",
    "kind": "string",
    "required": false
  },
  {
    "name": "arancelTotal",
    "kind": "string",
    "required": false
  },
  {
    "name": "arancelPeriodo",
    "kind": "string",
    "required": false
  },
  {
    "name": "perfil",
    "kind": "string",
    "required": true
  },
  {
    "name": "pilares",
    "kind": "array",
    "required": false,
    "item": [
      {
        "name": "n",
        "kind": "string",
        "required": true
      },
      {
        "name": "t",
        "kind": "string",
        "required": true
      },
      {
        "name": "d",
        "kind": "string",
        "required": true
      }
    ]
  },
  {
    "name": "egreso",
    "kind": "stringlist",
    "required": false
  },
  {
    "name": "campo",
    "kind": "stringlist",
    "required": false
  },
  {
    "name": "sectores",
    "kind": "stringlist",
    "required": false
  },
  {
    "name": "malla",
    "kind": "object",
    "required": false,
    "item": [
      {
        "name": "intro",
        "kind": "string",
        "required": true
      },
      {
        "name": "ejes",
        "kind": "array",
        "required": true,
        "item": [
          {
            "name": "t",
            "kind": "string",
            "required": true
          },
          {
            "name": "k",
            "kind": "string",
            "required": true
          }
        ]
      },
      {
        "name": "periodos",
        "kind": "array",
        "required": true,
        "item": [
          {
            "name": "rom",
            "kind": "string",
            "required": true
          },
          {
            "name": "a",
            "kind": "array",
            "required": true,
            "item": [
              {
                "name": "n",
                "kind": "string",
                "required": true
              },
              {
                "name": "k",
                "kind": "string",
                "required": true
              }
            ]
          }
        ]
      },
      {
        "name": "titulacion",
        "kind": "array",
        "required": false,
        "item": []
      }
    ]
  }
];

export const PAGE_LIST: ContentEntry[] = [
  {
    "slug": "404",
    "label": "Página no encontrada"
  },
  {
    "slug": "admisiones",
    "label": "Admisiones"
  },
  {
    "slug": "aranceles",
    "label": "Aranceles y matrículas"
  },
  {
    "slug": "becas",
    "label": "Becas"
  },
  {
    "slug": "educacion-continua",
    "label": "Educación continua"
  },
  {
    "slug": "estudiantes",
    "label": "Estudiantes"
  },
  {
    "slug": "home",
    "label": "Inicio"
  },
  {
    "slug": "investigacion",
    "label": "Investigación e innovación"
  },
  {
    "slug": "normativa",
    "label": "Normativa y transparencia"
  },
  {
    "slug": "nosotros",
    "label": "Nosotros"
  },
  {
    "slug": "noticias",
    "label": "Noticias"
  },
  {
    "slug": "oferta",
    "label": "Oferta Académica"
  },
  {
    "slug": "politica-de-privacidad",
    "label": "Política de privacidad y cookies"
  },
  {
    "slug": "programa-agricola",
    "label": "Programa Agrícola"
  },
  {
    "slug": "rendicion-de-cuentas",
    "label": "Rendición de Cuentas"
  },
  {
    "slug": "vinculacion",
    "label": "Vinculación con la sociedad"
  }
];

export const CAREER_LIST: ContentEntry[] = [
  {
    "slug": "administracion-empresas",
    "label": "Administración"
  },
  {
    "slug": "desarrollo-web",
    "label": "Desarrollo de Aplicaciones Web"
  },
  {
    "slug": "hospitalidad-lujo",
    "label": "Hospitalidad y Experiencias de Lujo"
  },
  {
    "slug": "marketing",
    "label": "Marketing"
  },
  {
    "slug": "microfinanzas",
    "label": "Microfinanzas"
  },
  {
    "slug": "negociacion-ventas",
    "label": "Negociación y Ventas"
  }
];

export const BLOG_CATEGORIES: string[] = [
  "Admisiones",
  "Metodología IA",
  "Empleabilidad",
  "Eventos",
  "Becas"
];
