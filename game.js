import './libs/weapp-adapter/index'
import './libs/symbol'
import Main from './js/main'

const loadTask = wx.loadSubpackage({
    name: 'model', // name 可以填 name 或者 root
    success: function (res) {
        console.log("加载分包成功1");
        const loadTask1 = wx.loadSubpackage({
            name: 'sub', // name 可以填 name 或者 root
            success: function (res) {
                console.log("加载分包成功2");
            },
            fail: function (res) {
                console.log("加载分包失败2");
            },
            complete: function (res) {
                console.log("加载分包完成2");
            }
        })
        loadTask1 && loadTask1.onProgressUpdate(res => {
            console.log('下载进度2', res.progress)
            console.log('已经下载的数据长度2', res.totalBytesWritten)
            console.log('预期需要下载的数据总长度2', res.totalBytesExpectedToWrite)
        })
        new Main()
    },
    fail: function (res) {
        console.log("加载分包失败1");
    },
    complete: function (res) {
        console.log("加载分包完成1");
    }
})

loadTask.onProgressUpdate(res => {
    console.log('下载进度1', res.progress)
    console.log('已经下载的数据长度1', res.totalBytesWritten)
    console.log('预期需要下载的数据总长度1', res.totalBytesExpectedToWrite)
})

