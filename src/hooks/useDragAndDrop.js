import useTabStore from '../store/useTabStore';

export default function useDragAndDrop() {
    const handleDragStart = useTabStore(state => state.handleDragStart);
    const setDragOverItem = useTabStore(state => state.setDragOverItem);
    const dropToTab = useTabStore(state => state.handleDrop);
    const dropToFolder = useTabStore(state => state.handleDropFolder);
    const dropToRoot = useTabStore(state => state.handleDropRoot);

    const onDragOver = (e, id) => {
        e.preventDefault();
        if (e.dataTransfer) {
            e.dataTransfer.dropEffect = "move";
        }
        setDragOverItem(id);
    };

    const onDragLeave = () => {
        setDragOverItem(null);
    };

    const onDropTab = (e, targetTab, spaceType) => {
        dropToTab(e, targetTab, spaceType);
    };

    const onDropFolder = (e, spaceType, targetFolderId) => {
        dropToFolder(e, spaceType, targetFolderId);
    };

    const onDropRoot = (e, spaceType) => {
        dropToRoot(e, spaceType);
    };

    return {
        handleDragStart,
        onDragOver,
        onDragLeave,
        onDropTab,
        onDropFolder,
        onDropRoot
    };
}
