import React, { useEffect, useRef } from 'react';
import { EditorState, EditorView, basicSetup } from '@codemirror/basic-setup';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';

import ACTIONS from '../Action';

const Editor = ({ socketRef, roomId, onCodeChange }) => {
    const editorRef = useRef(null);

    useEffect(() => {
        async function initEditor() {
            const editorContainer = document.getElementById('realtimeEditor');
            if (!editorContainer) return;

            const startState = EditorState.create({
                doc: '',
                extensions: [basicSetup, javascript(), oneDark],
            });

            const view = new EditorView({
                state: startState,
                parent: editorContainer,
            });

            editorRef.current = view;

            // Add 'change' event listener to handle code changes
            view.dispatch({
                effects: EditorView.updateListener.of((update) => {
                    if (update.changes) {
                        const code = view.state.doc.toString();
                        onCodeChange(code);
                        if (update.origin !== 'setValue') {
                            // Emit the code change event through socket
                            socketRef.current.emit(ACTIONS.CODE_CHANGE, {
                                roomId,
                                code,
                            });
                        }
                    }
                }),
            });
        }

        initEditor();

        // Clean up the editor when the component unmounts
        return () => {
            if (editorRef.current) {
                editorRef.current.destroy();
            }
        };
    }, [onCodeChange, roomId, socketRef]);

    useEffect(() => {
        if (socketRef.current) {
            // Listen for CODE_CHANGE events from the server
            socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code }) => {
                if (code && editorRef.current) {
                    const transaction = editorRef.current.state.update({
                        changes: { from: 0, to: editorRef.current.state.doc.length, insert: code },
                    });
                    editorRef.current.dispatch(transaction);
                }
            });
        }

        // Clean up socket listeners when the component unmounts or socketRef changes
        return () => {
            if (socketRef.current) {
                socketRef.current.off(ACTIONS.CODE_CHANGE);
            }
        };
    }, [socketRef]);

    return <div id="realtimeEditor"></div>;
};

export default Editor;
