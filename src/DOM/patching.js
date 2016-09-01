import {
	isNullOrUndef,
	isUndefined,
	isNull,
	isString,
	isStatefulComponent,
	isStringOrNumber,
	isInvalid,
	NO_OP,
	isNumber,
	isArray,
	isAttrAnEvent,
	throwError
} from './../core/utils';
import {
	mount,
	mountVTemplate,
	mountArrayChildrenWithType
} from './mounting';
import {
	insertOrAppend,
	isKeyed,
	isUnitlessNumber,
	booleanProps,
	strictProps,
	namespaces,
	replaceVListWithNode,
	normaliseChild,
	resetFormInputProperties,
	removeAllChildren,
	replaceWithNewNode,
	formSelectValue,
	updateTextContent,
	setTextContent,
	replaceChild,
	normalise
} from './utils';
import { componentToDOMNodeMap } from './rendering';
import {
	isVTemplate,
	isVFragment,
	isVText,
	TemplateValueTypes,
	isKeyedListChildrenType,
	isNonKeyedListChildrenType,
	isNodeChildrenType,
	isTextChildrenType,
	isUnknownChildrenType
} from '../core/shapes';
import { unmount } from './unmounting';

function replaceLastChildAndUnmount(lastInput, nextInput, parentDom, lifecycle, context, isSVG) {
	replaceChild(parentDom, mount(nextInput, null, lifecycle, context, isSVG), lastInput.dom);
	unmount(lastInput, null, lifecycle);
}

export function patch(lastInput, nextInput, parentDom, lifecycle, context, isSVG) {
	if (lastInput !== nextInput) {
		if (isVTemplate(nextInput)) {
			if (isVTemplate(lastInput)) {
				patchVTemplate(lastInput, nextInput, parentDom, lifecycle, context, isSVG);
			} else {
				replaceChild(parentDom, mountVTemplate(nextInput, null, lifecycle, context, isSVG), lastInput.dom);
				unmount(lastInput, null, lifecycle);
			}
		} else if (isVTemplate(lastInput)) {
			replaceLastChildAndUnmount(lastInput, nextInput, parentDom, lifecycle, context, isSVG);
		} else if (isVText(nextInput)) {
			if (isVText(lastInput)) {
				patchVText(lastInput, nextInput);
			}
		} else if (isVFragment(nextInput)) {
			if (isVFragment(lastInput)) {
				patchVFragment(lastInput, nextInput, parentDom, lifecycle, context, isSVG);
			} else {
				replaceChild(parentDom, mountVFragment(nextInput, null, lifecycle, context, isSVG), lastInput.dom);
				unmount(lastInput, null, lifecycle);
			}
		} else {
			if (process.env.NODE_ENV !== 'production') {
				throwError('bad input argument called on patch(). Input argument may need normalising.');
			}
			throwError();
		}
	}
}

function patchChildren(childrenType, lastChildren, nextChildren, parentDom, lifecycle, context, isSVG) {
	if (isTextChildrenType(childrenType)) {
		updateTextContent(parentDom, nextChildren);
	} else if (isNodeChildrenType(childrenType)) {
		patch(lastChildren, nextChildren, parentDom, lifecycle, context, isSVG);
	} else if (isKeyedListChildrenType(childrenType)) {
		patchKeyedChildren(lastChildren, nextChildren, parentDom, lifecycle, context, isSVG, null);
	} else if (isNonKeyedListChildrenType(childrenType)) {
		patchNonKeyedChildren(lastChildren, nextChildren, parentDom, lifecycle, context, isSVG, null, false);
	} else if (isUnknownChildrenType(childrenType)) {
		patchChildrenWithUnknownType(lastChildren, nextChildren, parentDom, lifecycle, context, isSVG);
	} else {
		if (process.env.NODE_ENV !== 'production') {
			throwError('bad childrenType value specified when attempting to patchChildren.');
		}
		throwError();
	}
}

export function patchChildrenWithUnknownType(lastChildren, nextChildren, parentDom, lifecycle, context, isSVG) {
	if (isInvalid(nextChildren)) {
		if (!isInvalid(lastChildren)) {
			removeAllChildren(parentDom, lastChildren, lifecycle);
		}
	} else if (isInvalid(lastChildren)) {
		if (isStringOrNumber(nextChildren)) {
			setTextContent(parentDom, nextChildren);
		} else if (!isInvalid(nextChildren)) {
			if (isArray(nextChildren)) {
				mountArrayChildrenWithoutType(nextChildren, parentDom, lifecycle, context, isSVG);
			} else {
				mount(nextChildren, parentDom, lifecycle, context, isSVG);
			}
		}
	} else if (isStringOrNumber(nextChildren)) {
		if (isStringOrNumber(lastChildren)) {
			updateTextContent(parentDom, nextChildren);
		} else {
			setTextContent(parentDom, nextChildren);
		}
	} else if (isStringOrNumber(lastChildren)) {
		const child = normalise(lastChildren);

		child.dom = parentDom.firstChild;
		patchChildrenWithUnknownType(child, nextChildren, parentDom, lifecycle, context, isSVG);
	} else if (isArray(nextChildren)) {
		if (isArray(lastChildren)) {
			nextChildren.complex = lastChildren.complex;

			if (isKeyed(lastChildren, nextChildren)) {
				patchKeyedChildren(lastChildren, nextChildren, parentDom, lifecycle, context, isSVG, null);
			} else {
				patchNonKeyedChildren(lastChildren, nextChildren, parentDom, lifecycle, context, isSVG, null, true);
			}
		} else {
			patchNonKeyedChildren([lastChildren], nextChildren, parentDom, lifecycle, context, isSVG, null, true);
		}
	} else if (isArray(lastChildren)) {
		patchNonKeyedChildren(lastChildren, [nextChildren], parentDom, lifecycle, context, isSVG, null, true);
	} else {
		patch(lastChildren, nextChildren, parentDom, lifecycle, context, isSVG);
	}
}

export function patchVText(lastVText, nextVText) {
	const nextText = nextVText.text;
	const dom = lastVText.dom;

	nextVText.dom = dom;
	if (lastVText.text !== nextText) {
		dom.nodeValue = nextText;
	}
}

export function patchVTemplate(lastVTemplate, nextVTemplate, parentDom, lifecycle, context, isSVG) {
	const dom = lastVTemplate.dom;
	const lastBp = lastVTemplate.bp;
	const nextBp = nextVTemplate.bp;

	nextVTemplate.dom = dom;
	if (lastBp !== nextBp) {
		const newDom = mountVTemplate(nextVTemplate, null, lifecycle, context, isSVG);

		replaceChild(parentDom, newDom, dom);
		unmount(lastVTemplate, null, lifecycle, true);
	} else {
		const bp0 = nextBp.v0;

		if (!isNull(bp0)) {
			const lastV0 = lastVTemplate.v0;
			const nextV0 = nextVTemplate.v0;
			const bp1 = nextBp.v1;

			if (lastV0 !== nextV0) {
				patchTemplateValue(bp0, lastV0, nextV0, dom, lifecycle, context, isSVG);
			}
			if (!isNull(bp1)) {
				const lastV1 = lastVTemplate.v1;
				const nextV1 = nextVTemplate.v1;

				if (lastV1 !== nextV1) {
					patchTemplateValue(bp1, lastV1, nextV1, dom, lifecycle, context, isSVG);
				}
			}
		}
	}
}

function patchTemplateValue(templateValueType, lastValue, nextValue, dom, lifecycle, context, isSVG) {
	switch (templateValueType) {
		case TemplateValueTypes.CHILDREN_KEYED:
			patchKeyedChildren(lastValue, nextValue, dom, lifecycle, context, isSVG, null);
			break;
		case TemplateValueTypes.CHILDREN_NON_KEYED:
			patchNonKeyedChildren(lastValue, nextValue, dom, lifecycle, context, isSVG, null, false);
			break;
		case TemplateValueTypes.CHILDREN_TEXT:
			updateTextContent(dom, nextValue);
			break;
		case TemplateValueTypes.CHILDREN_NODE:
			patch(lastValue, nextValue, dom, lifecycle, context, isSVG);
			break;
		case TemplateValueTypes.PROPS_CLASS_NAME:
			if (isNullOrUndef(nextValue)) {
				dom.removeAttribute('class');
			} else {
				dom.className = nextValue;
			}
			break;
	}
}

function patchVFragment(lastVFragment, nextVFragment, parentDom, lifecycle, context, isSVG) {
	const lastChildren = lastVFragment.children;
	const nextChildren = nextVFragment.children;
	const pointer = lastVFragment.pointer;

	nextVFragment.dom = lastVFragment.dom;
	nextVFragment.pointer = pointer;
	if (!lastChildren !== nextChildren) {
		const lastChildrenType = lastVFragment.childrenType;
		const nextChildrenType = nextVFragment.childrenType;

		if (lastChildrenType === nextChildrenType) {
			if (isKeyedListChildrenType(nextChildrenType)) {
				return patchKeyedChildren(lastChildren, nextChildren, parentDom, lifecycle, context, isSVG, nextVFragment);
			} else if (isNonKeyedListChildrenType(nextChildrenType)) {
				return patchNonKeyedChildren(lastChildren, nextChildren, parentDom, lifecycle, context, isSVG, nextVFragment, false);
			}
		}
		if (isKeyed(lastChildren, nextChildren)) {
			patchKeyedChildren(lastChildren, nextChildren, parentDom, lifecycle, context, isSVG, nextVFragment);
		} else {
			patchNonKeyedChildren(lastChildren, nextChildren, parentDom, lifecycle, context, isSVG, nextVFragment, true);
		}
	}
}

export function patchNonKeyedChildren(lastChildren, nextChildren, dom, lifecycle, context, isSVG, parentVList, shouldNormalise) {
	let lastChildrenLength = lastChildren.length;
	let nextChildrenLength = nextChildren.length;
	let commonLength = lastChildrenLength > nextChildrenLength ? nextChildrenLength : lastChildrenLength;
	let i = 0;

	for (; i < commonLength; i++) {
		const lastChild = lastChildren[i];
		const nextChild = shouldNormalise ? normaliseChild(nextChildren, i) : nextChildren[i];

		patch(lastChild, nextChild, dom, lifecycle, context, isSVG);
	}
	if (lastChildrenLength < nextChildrenLength) {
		for (i = commonLength; i < nextChildrenLength; i++) {
			const child = normaliseChild(nextChildren, i);

			insertOrAppend(dom, mount(child, null, lifecycle, context, isSVG), parentVList && parentVList.pointer);
		}
	} else if (lastChildrenLength > nextChildrenLength) {
		for (i = commonLength; i < lastChildrenLength; i++) {
			unmount(lastChildren[i], dom, lifecycle);
		}
	}
}

export function patchKeyedChildren(a, b, dom, lifecycle, context, isSVG, parentVList) {
	let aLength = a.length;
	let bLength = b.length;
	let aEnd = aLength - 1;
	let bEnd = bLength - 1;
	let aStart = 0;
	let bStart = 0;
	let i;
	let j;
	let aStartNode = a[aStart];
	let bStartNode = b[bStart];
	let aEndNode = a[aEnd];
	let bEndNode = b[bEnd];
	let aNode = null;
	let bNode = null;
	let nextNode;
	let nextPos;
	let node;

	if (aLength === 0) {
		if (bLength !== 0) {
			mountArrayChildrenWithType(b, dom, lifecycle, context, isSVG);
		}
		return;
	} else if (bLength === 0) {
		if (aLength !== 0) {
			removeAllChildren(dom, a, lifecycle);
		}
		return;
	}
	// Step 1
	/* eslint no-constant-condition: 0 */
	outer: while (true) {
		// Sync nodes with the same key at the beginning.
		while (aStartNode.key === bStartNode.key) {
			patch(aStartNode, bStartNode, dom, lifecycle, context, isSVG);
			aStart++;
			bStart++;
			if (aStart > aEnd || bStart > bEnd) {
				break outer;
			}
			aStartNode = a[aStart];
			bStartNode = b[bStart];
		}

		// Sync nodes with the same key at the end.
		while (aEndNode.key === bEndNode.key) {
			patch(aEndNode, bEndNode, dom, lifecycle, context, isSVG);
			aEnd--;
			bEnd--;
			if (aStart > aEnd || bStart > bEnd) {
				break outer;
			}
			aEndNode = a[aEnd];
			bEndNode = b[bEnd];
		}

		// Move and sync nodes from right to left.
		if (aEndNode.key === bStartNode.key) {
			patch(aEndNode, bStartNode, dom, lifecycle, context, isSVG);
			insertOrAppend(dom, bStartNode.dom, aStartNode.dom);
			aEnd--;
			bStart++;
			if (aStart > aEnd || bStart > bEnd) {
				break;
			}
			aEndNode = a[aEnd];
			bStartNode = b[bStart];
			// In a real-world scenarios there is a higher chance that next node after the move will be the same, so we
			// immediately jump to the start of this prefix/suffix algo.
			continue;
		}

		// Move and sync nodes from left to right.
		if (aStartNode.key === bEndNode.key) {
			patch(aStartNode, bEndNode, dom, lifecycle, context, isSVG);
			nextPos = bEnd + 1;
			nextNode = nextPos < b.length ? b[nextPos].dom : parentVList && parentVList.pointer;
			insertOrAppend(dom, bEndNode.dom, nextNode);
			aStart++;
			bEnd--;
			if (aStart > aEnd || bStart > bEnd) {
				break;
			}
			aStartNode = a[aStart];
			bEndNode = b[bEnd];
			continue;
		}
		break;
	}

	if (aStart > aEnd) {
		if (bStart <= bEnd) {
			nextPos = bEnd + 1;
			nextNode = nextPos < b.length ? b[nextPos].dom : parentVList && parentVList.pointer;
			while (bStart <= bEnd) {
				insertOrAppend(dom, mount(b[bStart++], null, lifecycle, context, isSVG), nextNode);
			}
		}
	} else if (bStart > bEnd) {
		while (aStart <= aEnd) {
			unmount(a[aStart++], dom, lifecycle);
		}
	} else {
		aLength = aEnd - aStart + 1;
		bLength = bEnd - bStart + 1;
		const aNullable = a;
		const sources = new Array(bLength);

		// Mark all nodes as inserted.
		for (i = 0; i < bLength; i++) {
			sources[i] = -1;
		}
		let moved = false;
		let pos = 0;
		let patched = 0;

		if ((bLength <= 4) || (aLength * bLength <= 16)) {
			for (i = aStart; i <= aEnd; i++) {
				aNode = a[i];
				if (patched < bLength) {
					for (j = bStart; j <= bEnd; j++) {
						bNode = b[j];
						if (aNode.key === bNode.key) {
							sources[j - bStart] = i;

							if (pos > j) {
								moved = true;
							} else {
								pos = j;
							}
							patch(aNode, bNode, dom, lifecycle, context, isSVG, false);
							patched++;
							aNullable[i] = null;
							break;
						}
					}
				}
			}
		} else {
			const keyIndex = new Map();

			for (i = bStart; i <= bEnd; i++) {
				node = b[i];
				keyIndex.set(node.key, i);
			}
			for (i = aStart; i <= aEnd; i++) {
				aNode = a[i];

				if (patched < bLength) {
					j = keyIndex.get(aNode.key);

					if (!isUndefined(j)) {
						bNode = b[j];
						sources[j - bStart] = i;
						if (pos > j) {
							moved = true;
						} else {
							pos = j;
						}
						patch(aNode, bNode, dom, lifecycle, context, isSVG, false);
						patched++;
						aNullable[i] = null;
					}
				}
			}
		}
		if (aLength === a.length && patched === 0) {
			removeAllChildren(dom, a, lifecycle);
			while (bStart < bLength) {
				insertOrAppend(dom, mount(b[bStart++], null, lifecycle, context, isSVG), null);
			}
		} else {
			i = aLength - patched;
			while (i > 0) {
				aNode = aNullable[aStart++];
				if (!isNull(aNode)) {
					unmount(aNode, dom, lifecycle);
					i--;
				}
			}
			if (moved) {
				let seq = lis_algorithm(sources);
				j = seq.length - 1;
				for (i = bLength - 1; i >= 0; i--) {
					if (sources[i] === -1) {
						pos = i + bStart;
						node = b[pos];
						nextPos = pos + 1;
						nextNode = nextPos < b.length ? b[nextPos].dom : parentVList && parentVList.pointer;
						insertOrAppend(dom, mount(node, dom, lifecycle, context, isSVG), nextNode);
					} else {
						if (j < 0 || i !== seq[j]) {
							pos = i + bStart;
							node = b[pos];
							nextPos = pos + 1;
							nextNode = nextPos < b.length ? b[nextPos].dom : parentVList && parentVList.pointer;
							insertOrAppend(dom, node.dom, nextNode);
						} else {
							j--;
						}
					}
				}
			} else if (patched !== bLength) {
				for (i = bLength - 1; i >= 0; i--) {
					if (sources[i] === -1) {
						pos = i + bStart;
						node = b[pos];
						nextPos = pos + 1;
						nextNode = nextPos < b.length ? b[nextPos].dom : parentVList && parentVList.pointer;
						insertOrAppend(dom, mount(node, null, lifecycle, context, isSVG), nextNode);
					}
				}
			}
		}
	}
}

// https://en.wikipedia.org/wiki/Longest_increasing_subsequence
function lis_algorithm(a) {
	let p = a.slice(0);
	let result = [];
	result.push(0);
	let i;
	let j;
	let u;
	let v;
	let c;

	for (i = 0; i < a.length; i++) {
		if (a[i] === -1) {
			continue;
		}

		j = result[result.length - 1];
		if (a[j] < a[i]) {
			p[i] = j;
			result.push(i);
			continue;
		}

		u = 0;
		v = result.length - 1;

		while (u < v) {
			c = ((u + v) / 2) | 0;
			if (a[result[c]] < a[i]) {
				u = c + 1;
			} else {
				v = c;
			}
		}

		if (a[i] < a[result[u]]) {
			if (u > 0) {
				p[i] = result[u - 1];
			}
			result[u] = i;
		}
	}

	u = result.length;
	v = result[u - 1];

	while (u-- > 0) {
		result[u] = v;
		v = p[v];
	}

	return result;
}

export function patchVariableAsExpression(pointer, templateIsSVG) {
	return function patchVariableAsExpression(lastVTemplate, nextVTemplate, parentDom, lifecycle, context, isSVG) {
		const lastInput = readFromVTemplate(lastVTemplate, pointer);
		let nextInput = readFromVTemplate(nextVTemplate, pointer);

		if (lastInput !== nextInput) {
			if (isNullOrUndef(nextInput) || !isVNode(nextInput)) {
				nextInput = normalise(nextInput);
				writeToVTemplate(nextVTemplate, pointer, nextInput);
			}
			patch(lastInput, nextInput, parentDom, lifecycle, context, isSVG || templateIsSVG);
		}
	};
}

export function patchVariableAsChildren(pointer, templateIsSVG, childrenType) {
	return function patchVariableAsChildren(lastVTemplate, nextVTemplate, parentDom, lifecycle, context, isSVG) {
		const lastInput = readFromVTemplate(lastVTemplate, pointer);
		const nextInput = readFromVTemplate(nextVTemplate, pointer);

		if (lastInput !== nextInput) {
			patchChildren(childrenType, lastInput, nextInput, parentDom, lifecycle, context, isSVG || templateIsSVG);
		}
	};
}

export function patchVariableAsText(pointer) {
	return function patchVariableAsText(lastVTemplate, nextVTemplate, textNode) {
		const nextInput = readFromVTemplate(nextVTemplate, pointer);

		if (readFromVTemplate(lastVTemplate, pointer) !== nextInput) {
			textNode.nodeValue = nextInput;
		}
	};
}

export function patchTemplateClassName(pointer) {
	return function patchTemplateClassName(lastVTemplate, nextVTemplate, dom) {
		const nextClassName = readFromVTemplate(nextVTemplate, pointer);

		if (readFromVTemplate(lastVTemplate, pointer) !== nextClassName) {
			if (isNullOrUndef(nextClassName)) {
				dom.removeAttribute('class');
			} else {
				dom.className = nextClassName;
			}
		}
	};
}

export function patchTemplateStyle(pointer) {
	return function patchTemplateClassName(lastVTemplate, nextVTemplate, dom) {
		const lastStyle = readFromVTemplate(lastVTemplate, pointer);
		const nextStyle = readFromVTemplate(nextVTemplate, pointer);

		if (lastStyle !== nextStyle) {
			patchStyle(lastStyle, nextStyle, dom);
		}
	};
}

export function patchTemplateProps(propsToPatch, tag) {
	return function patchTemplateProps(lastVTemplate, nextVTemplate, dom) {
		// used for form values only
		let formValue;

		if (tag === 'input') {
			resetFormInputProperties(dom);
		}
		for (let i = 0; i < propsToPatch.length; i += 2) {
			const prop = propsToPatch[i];
			const value = propsToPatch[i + 1];
			let lastValue = value;
			let nextValue = value;

			if (isVariable(value)) {
				lastValue = readFromVTemplate(lastVTemplate, value.pointer);
				nextValue = readFromVTemplate(nextVTemplate, value.pointer);
			}
			if (prop === 'value') {
				formValue = nextValue;
			}
			patchProp(prop, lastValue, nextValue, dom);
		}
		if (tag === 'select') {
			formSelectValue(dom, formValue);
		}
	};
}

// returns true if a property has been applied that can't be cloned via elem.cloneNode()
export function patchProp(prop, lastValue, nextValue, dom) {
	if (strictProps[prop]) {
		dom[prop] = isNullOrUndef(nextValue) ? '' : nextValue;
	} else if (booleanProps[prop]) {
		dom[prop] = nextValue ? true : false;
	} else {
		if (lastValue !== nextValue) {
			if (isNullOrUndef(nextValue)) {
				dom.removeAttribute(prop);
				return false;
			}
			if (prop === 'className') {
				dom.className = nextValue;
				return false;
			} else if (prop === 'style') {
				patchStyle(lastValue, nextValue, dom);
			} else if (prop === 'defaultChecked') {
				if (isNull(lastValue)) {
					dom.addAttribute('checked');
				}
				return false;
			} else if (prop === 'defaultValue') {
				if (isNull(lastValue)) {
					dom.setAttribute('value', nextValue);
				}
				return false;
			} else if (isAttrAnEvent(prop)) {
				dom[prop.toLowerCase()] = nextValue;
			} else if (prop === 'dangerouslySetInnerHTML') {
				const lastHtml = lastValue && lastValue.__html;
				const nextHtml = nextValue && nextValue.__html;

				if (isNullOrUndef(nextHtml)) {
					if (process.env.NODE_ENV !== 'production') {
						throwError('dangerouslySetInnerHTML requires an object with a __html propety containing the innerHTML content.');
					}
					throwError();
				}
				if (lastHtml !== nextHtml) {
					dom.innerHTML = nextHtml;
				}
			} else if (prop !== 'childrenType' && prop !== 'ref' && prop !== 'key') {
				const ns = namespaces[prop];

				if (ns) {
					dom.setAttributeNS(ns, prop, nextValue);
				} else {
					dom.setAttribute(prop, nextValue);
				}
				return false;
			}
		}
	}
	return true;
}

export function patchSpreadPropsFromTemplate(pointer, templateIsSVG, tag) {
	return function patchSpreadPropsFromTemplate(lastVTemplate, nextVTemplate, dom, lifecycle, context, isSVG) {
		const lastProps = readFromVTemplate(lastVTemplate, pointer) || {};
		const nextProps = readFromVTemplate(nextVTemplate, pointer) || {};
		// used for form values only
		let formValue;

		for (let prop in nextProps) {
			const lastValue = nextProps[prop];
			const nextValue = nextProps[prop];

			if (prop === 'key') {
				nextVTemplate.key = nextValue;
			} else if (prop === 'children') {
				if (lastValue !== nextValue) {
					patchChildrenWithUnknownType(lastValue, nextValue, dom, lifecycle, context, isSVG || templateIsSVG);
				}
			} else {
				if (isNullOrUndef(nextValue)) {
					removeProp(prop, dom);
				} else {
					patchProp(prop, lastValue, nextValue, dom);
				}
			}
			if (prop === 'value') {
				formValue = nextValue;
			}
		}
		for (let prop in lastProps) {
			if (isNullOrUndef(nextProps[prop])) {
				removeProp(prop, dom);
			}
		}
		if (tag === 'select') {
			formSelectValue(dom, formValue);
		}
	};
}