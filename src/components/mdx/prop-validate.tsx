import type { JsxComponentDescriptor } from "@mdxeditor/editor";
import { JSX } from "react";

interface MdxPropsValidatorReturn {
  isValid: boolean;
  errJsx: JSX.Element | null;
}

export const mdxPropsValidator = <Props extends object>(
  mdxComponentDescriptor: Omit<JsxComponentDescriptor, "Editor">,
  propsInput: Props,
): MdxPropsValidatorReturn => {
  const ks = Object.keys(propsInput);
  const errs = [];
  for (const propDesc of mdxComponentDescriptor.props) {
    if (propDesc.required && !ks.includes(propDesc.name)) {
      errs.push("Required prop '" + propDesc.name + "' is missing.");
    }
  }
  if (errs.length > 0) {
    return {
      isValid: false,
      errJsx: ErrJsx(mdxComponentDescriptor?.name ?? "Unknown Component", errs),
    };
  }
  return {
    isValid: true,
    errJsx: null,
  };
};

const ErrJsx = (name: string, errs: string[]): JSX.Element => {
  return (
    <div
      className="bg-background text-destructive mb-4 rounded-lg p-4"
      role="alert"
    >
      <strong className="font-bold">Error in {name} component props:</strong>
      <ul>
        {errs.map((err, idx) => (
          <li key={idx}>{err}</li>
        ))}
      </ul>
    </div>
  );
};
