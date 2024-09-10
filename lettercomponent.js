

class Lettercomponent extends HTMLElement {

    static observedAttributes = ['doc_id', 'client_id', 'person_position', 'letter_type'];

    constructor() {
        super();
        // Initialize the state

        var template = document.querySelector('.brief_editor_template');
        this.appendChild(template.content.cloneNode(true));
        this.briefcontainer = this.querySelector('.briefcontainer')
        this.pages = [];
        this.index = 0;
        this.page_layout = null;
        this.getPageLayout();
        this.initComponent();
    }

    getPageLayout(){
      this.page_layout = {
        first_page: [
          { name: "letter-body", configuration: { top: "27mm" } }
        ],
          other_page: [
          { name: "letter-body", configuration: { top: "27mm" } }
        ]
      };
    }
    initComponent() {
        if(this.pages.length){
            this.clearComponent();
        }
        this.getPageLayout();
        this.resetContent("")
    }


    resetContent(content){
        if(this.pages.length){
            for (let item of this.pages){
                this.briefcontainer.removeChild(item.page);
            }
            this.pages = [];
            this.index = 0;
        }
        if(!content.length){
            content = "<div><br></div>";
        }

        var editor = new Letterbodycomponent();
        editor.initComponent(content, this.index);
        var page = this.createNewPage(editor);
        this.addPage(page);

        this.fit_content_over_pages();
    }


    createNewPage(editor) {
        var page = new PageComponent();
        page.page_layout = this.page_layout;
        page.initPage(this.index);
        page.registerEditor(editor);
        return page;
    }

    /**
     * Spreads the HTML Content over several pages if neccessary.
     * This methods is responsible for foward and Backwards propagation by iteration all pages
     */
    fit_content_over_pages(){

        for(let page_o of this.pages){
            const page = page_o.page;
            if (!page.getEditorContent().length && page_o.index != 0) {
                this.removePage(page_o.index);
            }
        }

        // Save current selection (or cursor position) by inserting empty HTML elements at the start and the end of it
        const selection = window.getSelection();
        const start_marker = document.createElement("span");
        start_marker.className = "start-marker";
        const end_marker = document.createElement("span");
        end_marker.className = "end-marker";


        // don't insert markers in case selection fails )
        if(selection && selection.rangeCount && selection.anchorNode ) {
            const range = selection.getRangeAt(0);
            range.insertNode(start_marker);
            range.collapse(false);
            range.insertNode(end_marker);
        }

        for(let page_idx = 0; page_idx < this.pages.length; page_idx++){
            const page = this.pages[page_idx].page;
            let next_page_o = this.pages[page_idx + 1];
            let next_page = (next_page_o != null )? next_page_o.page : null;

            /**
             * Backward propagation.
             * Evaluate if the content of the actual page does not overflow then check if the next page exist.
             * In that case we merge as much as possible the content of the next page with the actual page until the content overflow.
             */
            if(!page.isBodyEditorOverflowed() && ( next_page != null) ){
                this.moveChildrenBackwardWithMergingRecursively(page.getBodyEditorElt(), next_page.getBodyEditorElt(), () => (!next_page.getBodyEditorElt().childNodes.length || page.isBodyEditorOverflowed()));
            }

            if(page.isBodyEditorOverflowed()){
                if( next_page == null ){
                    this.renderPages("<div><br></div>")
                    next_page_o = this.pages[page_idx + 1];
                    next_page = next_page_o.page
                }
                this.moveChildrenFowardWithMergingRecursively(page.getBodyEditorElt(), next_page.getBodyEditorElt(), () => (page.isBodyEditorOverflowed()) );
            }

        }

        for(const page_o of this.pages) {
            const page = page_o.page;
            page.getBodyEditorElt().normalize();
        }


        // Restore selection and remove empty elements
        if(document.body.contains(start_marker)){
            const range = document.createRange();
            range.setStart(start_marker, 0);
            if(document.body.contains(end_marker)) range.setEnd(end_marker, 0);
            selection.removeAllRanges();
            selection.addRange(range);
        }
        if(start_marker.parentElement) start_marker.parentElement.removeChild(start_marker);
        if(end_marker.parentElement) end_marker.parentElement.removeChild(end_marker);

    }

    moveChildrenBackwardWithMergingRecursively(activ_element, next_element, stopCondition){
        // loop until content is overflowing
        while(!stopCondition()){

            // find first child of next page
            const first_child = next_element.firstChild;

            const start_marker = first_child.querySelector('.start-marker');
            const end_marker = first_child.querySelector('.end-marker');
            if(start_marker && end_marker){
                this.append_marker_to_previous_page(activ_element.lastChild, start_marker, end_marker)
            }
            // merge it at the end of the current page
            var merge_recursively = (container, elt) => {
                // check if child had been splitted (= has a sibling on previous page)
                const elt_sibling = this.find_next_element_sibling_node(container, elt.s_tag);
                if(elt_sibling && elt.childNodes.length) {
                    // then dig for deeper children, in case of
                    merge_recursively(elt_sibling, elt.firstChild);
                }
                // else move the child inside the right container at current page
                else {
                    container.append(elt);
                    container.normalize();
                }
            }
            merge_recursively(activ_element, first_child);
        }
        return stopCondition();
    }

    moveChildrenFowardWithMergingRecursively(activ_element, next_element, stopCondition){

        let not_first_child = true;
        while(activ_element.childNodes.length && stopCondition()) {

            // check if page has only one child tree left
            not_first_child = not_first_child || (activ_element.childNodes.length != 1);

            // select the last sub-child
            const sub_child = activ_element.lastChild;
            // if it is a text node, move its content to next page word(/space) by word
            if (sub_child.nodeType == Node.TEXT_NODE) {
                const sub_child_hashes = sub_child.textContent.match(/(\s|\S+)/g);
                const sub_child_continuation = document.createTextNode('');
                next_element.prepend(sub_child_continuation);
                const l = sub_child_hashes ? sub_child_hashes.length : 0;
                for (let i = 0; i < l; i++) {
                    if (i == l - 1 && !not_first_child) return; // never remove the first word of the page
                    sub_child.textContent = sub_child_hashes.slice(0, l - i - 1).join('');
                    sub_child_continuation.textContent = sub_child_hashes.slice(l - i - 1, l).join('');
                    if (!stopCondition()) return;
                }
            }
            else if(!sub_child.childNodes.length || sub_child.tagName.match(/h\d/i) || sub_child.tagName.match(/tr/i) ) {
                // just prevent moving the last child of the page
                if(!not_first_child){
                    console.error("Move-forward: first child reached with no stop condition. Aborting");
                    return;
                }
                next_element.prepend(sub_child);
            }
            // for every other node that is not text and not the first child, clone it recursively to next page
            else {

                // check if sub child has already been cloned before
                let sub_child_sibling = this.find_next_element_sibling_node(next_element, sub_child.s_tag);

                // if not, create it and watermark the relationship with a random tag
                if(!sub_child_sibling) {
                    if(!sub_child.s_tag) {
                        const new_random_tag = Math.random().toString(36).slice(2, 8);
                        sub_child.s_tag = new_random_tag;
                    }
                    sub_child_sibling = sub_child.cloneNode(false);
                    sub_child_sibling.s_tag = sub_child.s_tag;
                    next_element.prepend(sub_child_sibling);
                }

                // then move/clone its children and sub-children recursively
                this.moveChildrenFowardWithMergingRecursively(sub_child, sub_child_sibling, stopCondition);
                sub_child_sibling.normalize(); // merge consecutive text nodes
            }

            // if sub_child was a container that was cloned and is now empty, we clean it
            if(activ_element.contains(sub_child)){
                if(sub_child.childNodes.length == 0 || sub_child.innerHTML == "") activ_element.removeChild(sub_child);
                else if(stopCondition()) {
                    // the only case when it can be non empty should be when stop_condition is now true
                    throw Error("Document editor is trying to remove a non-empty sub-child. This "
                        + "is a bug and should not happen. Please report a repeatable set of actions that "
                        + "leaded to this error to https://github.com/motla/vue-document-editor/issues/new");
                }
            }

        }
    }

    /**
     * Utility function that acts like an Array.filter on childNodes of "container"
     * @param {HTMLElement} container
     * @param {string} s_tag
     */
    find_next_element_sibling_node (container, s_tag){
        if(!container || !s_tag) return false;
        const child_nodes = container.childNodes;
        for(let i = 0; i < child_nodes.length; i++) {
            if(child_nodes[i].s_tag == s_tag) return child_nodes[i];
        }
        return false;
    }

    append_marker_to_previous_page(container, start_marker, end_marker){
        let last_child = container.lastChild;
        if(last_child != null && last_child.nodeType !=  3){
            last_child.appendChild(start_marker);
            last_child.appendChild(end_marker);
        }
    }


    addPage(page) {
        this.briefcontainer.appendChild(page);
        this.pages.push({ page , index: this.index });
        this.index += 1;
    }

    removePage(index){
        const originalIndex = this.pages.findIndex(item => item.index === (index));
        if(originalIndex != -1){
            var page = this.pages[originalIndex].page;
            this.pages.splice(originalIndex, 1);
            this.briefcontainer.removeChild(page);
        }
    }

    clearComponent(){
        for (let item of this.pages){
            this.briefcontainer.removeChild(item.page);
        }
        this.pages = [];
        this.index = 0;
    }

    renderPages(content){
        var editor = new Letterbodycomponent();
        editor.initComponent(content, this.index);
        var page = this.createNewPage(editor);
        this.addPage(page)
    }

    connectedCallback() {

        var that = this;

        this.addEventListener('keyup', (e) => {
            if(e.target.classList.contains("wysiwyg-editorcomponent")){
                this.fit_content_over_pages();
            }
        })

        tinyMCE.init({
            selector: 'textarea#textmodule_editor',
            plugins: "table",
            //menubar: "table",
            toolbar: "undo redo | bold italic underline | outdent indent justifyleft justifycenter justifyright bullist numlist | pastetext | table | variablen ",
            language: 'de',
            setup: function (editor) {
                editor.ui.registry.addMenuButton('variablen', {
                    text: 'Variablen',
                    fetch: function (callback) {
                        let items = [];
                        for (let i in data.variables) {
                            let obj = {};
                            obj.type = 'menuitem';
                            obj.text = data.variables[i].label;
                            obj.onAction = function () {
                                editor.insertContent('{' + data.variables[i].name + '}')
                            }
                            items.push(obj);
                        }
                        callback(items);
                    }
                });
            },
        });

    }

    resetForm(){
    }

    saveTextModule($button, $html) {
    }

    addEventsToDocEntries() {

    }

    disconnectedCallback() {
        console.log("Child Custom element removed from page.");
    }

    adoptedCallback() {
        console.log("Child Custom element moved to new page.");
    }

    attributeChangedCallback(name, oldValue, newValue) {
        var that = this;

    }
}


customElements.define('lettereditor-component', Lettercomponent);
