/** 静态资源文本导入声明 —— tsup 通过 text loader 把 UI 资源内嵌进单文件产物。
 *  使用 .client 扩展名承载浏览器脚本，避免与 Node/TS 的 .js 模块解析冲突。 */
declare module "*.html" {
    /**
     * 文件文本内容。
     */
    const content: string;
    export default content;
}

declare module "*.css" {
    /**
     * 文件文本内容。
     */
    const content: string;
    export default content;
}

declare module "*.client" {
    /**
     * 文件文本内容。
     */
    const content: string;
    export default content;
}
