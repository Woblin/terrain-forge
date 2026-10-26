import { useReducer, type ActionDispatch } from 'react';
import {
  editorReducer,
  INITIAL_EDITOR_STATE,
  type EditorAction,
  type EditorState,
} from '../domain/editor';

/** The board's pieces, selection and undo history. */
export function useLayoutEditor(): [EditorState, ActionDispatch<[EditorAction]>] {
  return useReducer(editorReducer, INITIAL_EDITOR_STATE);
}
