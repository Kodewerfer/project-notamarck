import {useRef} from "react";
import "./App.css";
import dedent from "dedent";
import Editor, {TEditorForwardRef} from "react-magic-draft-md";

const MarkdownFakeDateTwo = dedent`
# Title!

Normal text test one

Normal text test two

Normal text test three

**custom**Normal text test

**syntax**

**custom1** **custom2** **custom3**

 - list1**test**
 - list2
 - list3

`;

export default function App() {
    const EditorRef = useRef<TEditorForwardRef>(null);
    
    async function appClick() {
        console.log("NOTAMARCK click");
        if (EditorRef.current) {
            console.log(await EditorRef.current.ExtractMD());
        }
    }
    
    return (
        <div className="App">
            <button className={"bg-amber-600"} onClick={appClick}>
                NOTAMARCK EXTRACT
            </button>
            <main className="Main-wrapper">
                <Editor SourceData={MarkdownFakeDateTwo} ref={EditorRef}/>
            </main>
        </div>
    );
}
