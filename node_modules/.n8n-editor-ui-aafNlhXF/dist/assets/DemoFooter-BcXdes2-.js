import LogsPanel from "./LogsPanel--mFob2p-.js";
import { d as defineComponent, a5 as useWorkflowsStore, x as computed, e as createBlock, f as createCommentVNode, g as openBlock } from "./index-CH1Gwq1G.js";
import "./useKeybindings-qOhJshmS.js";
import "./FileSaver.min-5FQPbO92.js";
import "./useExecutionHelpers-9NlZryk2.js";
import "./AnimatedSpinner-GulG2K0j.js";
import "./ConsumedTokensDetails.vue_vue_type_script_setup_true_lang-DJZbQ3zM.js";
import "./VueMarkdown-qUi2j4nV.js";
import "./ActionDropdown-ruV_IoDb.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "DemoFooter",
  setup(__props) {
    const workflowsStore = useWorkflowsStore();
    const hasExecutionData = computed(() => workflowsStore.workflowExecutionData);
    return (_ctx, _cache) => {
      return hasExecutionData.value ? (openBlock(), createBlock(LogsPanel, {
        key: 0,
        "is-read-only": true
      })) : createCommentVNode("", true);
    };
  }
});
export {
  _sfc_main as default
};
