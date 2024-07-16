import { ForwardedRef, forwardRef, useImperativeHandle, useRef } from 'react';
import './MarkdownEditor.css';
import Editor, { TEditorForwardRef } from 'react-magic-draft';

export type TEditorComponentRef = {
  ExtractMD: () => Promise<string>;
};

const MarkdownEditor = forwardRef(({ MDSource }: { MDSource: string }, ref: ForwardedRef<TEditorComponentRef>) => {
  const EditorRef = useRef<TEditorForwardRef>(null);

  useImperativeHandle(ref, () => {
    return {
      ExtractMD: async () => {
        if (EditorRef.current) return await EditorRef.current.ExtractMD();
        return Promise.resolve('');
      },
    };
  });

  async function appClick() {
    console.log('NOTAMARCK click');
    if (EditorRef.current) {
      console.log(await EditorRef.current.ExtractMD());
    }
  }

  return (
    <>
      <button className={'bg-amber-600'} onClick={appClick}>
        NOTAMARCK EXTRACT
      </button>
      <Editor SourceData={MDSource} ref={EditorRef} />
    </>
  );
});

export default MarkdownEditor;
