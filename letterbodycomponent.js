
const template = document.createElement('template');
template.innerHTML = `<div  class="wysiwyg-editorcomponent"  style="height: 100%;width:100%;font-size: 13px;padding:5px;overflow: hidden;min-height: 600px;font-family: "ProximaNova-Regular";line-height: 1.5;>

</div>`;


/**
 * PdfPageManager for managing pdf pages
 * @class PdfPageManager
 */
class Letterbodycomponent extends HTMLElement {
    static observedAttributes = ['person_guid', 'vorlage_id', 'filename', 'local_name', 'doc_path', 'scanned', 'doc_guid', 'state', 'vz', 'parentnodename']
    constructor() {
        super();
        this.appendChild(template.content.cloneNode(true));
        this.wyeidtor = this.querySelector(".wysiwyg-editorcomponent");

        this.leftoverChildren = [];

        this.content = "";
        this.id = "";

        this.shortcuts = [];
        this.bookmark = null;

    }

    initComponent(content, index){
        if(content.length){
            this.wyeidtor.innerHTML = content;
            this.id = 'wysiwyg-editorcomponent-'+ index;
            this.wyeidtor.setAttribute('id', this.id)

        }
    }

    notifyContentSizeChange(content) {
        const event = new CustomEvent('contentSizeChange', {
            bubbles: true,
            detail: { content: content }
        });
        this.dispatchEvent(event);
    }

    notifyEditorUndoChange() {
        const event = new CustomEvent('notifyUndoChange', {
            bubbles: true,
            detail: { content: this.wyeidtor.innerHTML }
        });
        this.dispatchEvent(event);
    }

    focusOnTextEditorStart(){
        if (tinymce.get(this.id)) {
            const editor = tinymce.get(this.id);
            editor.focus();
        }
    }

    focusOnTextEditor(){
        if (tinymce.get(this.id)) {
            const editor = tinymce.get(this.id);
            editor.focus();
            editor.selection.select(editor.getBody(), true);
            editor.selection.collapse(false)
        }
    }


    connectedCallback() {
        var that = this;
        //this.renderContent();

        tinymce.init({
            selector: '.wysiwyg-editorcomponent#' + that.id,
            menubar: false,
            inline: true,
            plugins: [
                'autolink', 'codesample', 'link', 'lists'
                , 'powerpaste', 'table',
                'quickbars', 'codesample', 'help', 'pagebreak'
            ],
            toolbar: 'quicktable pagebreak',
            toolbar_location: 'top',
            quickbars_insert_toolbar: false,
            quickbars_selection_toolbar: 'bold italic underline | alignleft aligncenter alignright alignjustify | blocks | blockquote quicklink | pagebreak',
            contextmenu: 'undo redo | inserttable | cell row column deletetable | help',
            powerpaste_word_import: 'clean',
            pagebreak_split_block: true,
            setup: function (ed) {

            }

        });
    }

    getEditorElt(){
        return this.wyeidtor;
    }

    isContentEmpty(){
        let text_content = this.wyeidtor.innerText;
        return text_content.replaceAll(/\s+/g, '').length ? 0 : 1;
    }

    isOverflowed(){
        return this.wyeidtor.scrollHeight > this.wyeidtor.clientHeight
    }

    getHtmlContent(){
        return this.wyeidtor.innerHTML;
    }

    disconnectedCallback() {

        this.destroyEditor()
        //console.log("Child Custom element removed from page.");
    }

    adoptedCallback() {
        //console.log("Child Custom element moved to new page.");
    }

    attributeChangedCallback(name, oldValue, newValue) {
        var that = this
    }

    renderContent(){
        setTimeout(() => {
            this.leftoverChildren = [];
            let cumulativeHeight = 0;
            for (const child of this.wyeidtor.childNodes) {
                if (child.nodeName !== "#text") {
                    var height = child.offsetHeight;
                    var style = window.getComputedStyle(child);
                    height += parseInt(style.marginTop) + parseInt(style.marginBottom);
                    if(cumulativeHeight + height < this.wyeidtor.clientHeight){
                        this.previousHeight = cumulativeHeight + height;
                    }
                    cumulativeHeight += height;
                }

                if (cumulativeHeight > this.wyeidtor.clientHeight) {
                    this.leftoverChildren.push(child);
                }
            }

            if(this.leftoverChildren.length){
                for(let item of this.leftoverChildren){
                    this.wyeidtor.removeChild(item);
                }
                this.notifyContentSizeChange(this.leftoverChildren.map(node => node.outerHTML).join(''))
            }
        }, 0);

        const node = this.wyeidtor.querySelector('#cursor-selector');
        // Add code hier

        if(node){
            var selObj = window.getSelection();
            const range = selObj.getRangeAt(0);
            range.deleteContents();
            range.setStartAfter(node);
            range.setEndAfter(node);
            selObj.removeAllRanges();
            selObj.addRange(range);

            this.wyeidtor.focus();

        }


    }

    renderElement(content){
        // Create an off-screen element to measure the height
        const offscreenElement = document.createElement('div');
        this.wyeidtor.innerHTML = content;
     }

     getShortcutTranslation(shortcut){
         return new Promise((resolve, reject) => {
             $.get(base_url + 'lettereditor/getTextModulesShortcutsContent?code=' + shortcut, (response) => {
                 try {
                     const parsedResponse = JSON.parse(response);
                     const value = parsedResponse.data;
                     resolve(value);
                 } catch (error) {
                     reject(error);
                 }
             });
         });
     }

    updateEditor(content) {
        this.wyeidtor.innerHTML = content;
        this.renderContent();

    }

    // Debounce function
    debounce(func, delay) {
        let debounceTimer;
        return function (...args) {
            // Clear the previous timer to prevent the execution of 'mainFunction'
            clearTimeout(debounceTimer);

            // Set a new timer that will execute 'mainFunction' after the specified delay
            debounceTimer = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    }

    destroyEditor() {
        if (tinymce.get(this.id)) {
            tinymce.get(this.id).destroy();
        }
    }

}


customElements.define("letterbody-component", Letterbodycomponent);
