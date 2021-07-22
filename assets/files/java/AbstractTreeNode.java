package com.pandaq.utils;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 扁平列表数据结构转换成树状数据结构的工具。<br /><br />
 * 使用方式：<br /><br />
 *
 * 1. 原始数据节点继承 <code>AbstractTreeNode<code/> 抽象类：<code>public class MyNode extends AbstractTreeNode&lt;String, MyNode&gt;</code> ；<br/>
 * 2. 原始数据节点覆写 <code>nodeID()</code> 和 <code>parentNodeID()</code> 两个方法，分别返回节点ID和父节点ID；<br/>
 * 3. 假设有原始节点数据列表 <code>List&lt;MyNode&gt; input;</code> 使用 <code>List&lt;MyNode&gt; output = MyNode.transfer(input)</code> 静态方法调用方式得到output，即树状结构列表数据。
 *
 * @author yansong
 * @date 2020-10-21 21:56
 */
public abstract class AbstractTreeNode<ID, N> {

    private List<N> child = new ArrayList<>();

    /**
     * 获取节点的子节点列表
     * @return 返回节点的子节点列表
     */
    public List<N> getChild() {
        return child;
    }

    /**
     * 获取节点的ID，需要具备唯一性。子类须实现该方法，返回节点ID
     * @return 返回节点ID
     */
    protected abstract ID nodeID();

    /**
     * 获取父节点ID，需要具备唯一性。子类须实现该方法，返回父节点ID
     * @return 返回父节点ID
     */
    protected abstract ID parentNodeID();

    /**
     * 转换方法工具
     * @param list 扁平的原始数据列表
     * @return 返回树状结构数据list
     */
    public static <ID, N extends AbstractTreeNode<ID, N>> List<N> transfer(List<N> list) {
        // 将list数据映射到Map中，Key为节点ID，Value为节点实例N
        Map<ID, N> allMap = new HashMap<>();
        for (N node : list) {
            allMap.put(node.nodeID(), node);
        }
        // 转换成树状结构数据
        List<N> nodeList = new ArrayList<>();
        for (N node : list) {
            // 获取当前节点的父节点
            N parentNode = allMap.get(node.parentNodeID());
            if (parentNode == null) {
                // 没有父节点，说明这个节点是顶级节点：将这个节点直接放入结果中
                nodeList.add(allMap.get(node.nodeID()));
            } else {
                // 有父节点，取父节点的child并将该节点添加到父节点的child列表中
                parentNode.getChild().add(allMap.get(node.nodeID()));
            }
        }
        return nodeList;
    }

}
