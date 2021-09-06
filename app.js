const { QLabel, QApplication, QMainWindow, QWidget, FlexLayout, WidgetEventTypes, QPushButton } = require("@nodegui/nodegui");
const resolution = require("screen-resolution");
const sleep = (ms) => new Promise(resolve => setTimeout(() => { resolve() }, ms));
const quality = 150;
let boards = [];
const minePercentage = 5;
const qApp = QApplication.instance();
let jobRunning = false;
let gameOver = false;
qApp.setQuitOnLastWindowClosed(false);

(async () => {
    const screenSize = await new Promise((resolve, reject) => resolution.get().then(result => resolve(result)));
    console.log(screenSize)
    console.log("Running");
    for (let x = 0; x < Math.floor(screenSize.width / quality); x++) {
        for (let y = 1; y < Math.floor(screenSize.height / quality); y++) {
            const win = new QMainWindow();
            const centralWidget = new QWidget();
            centralWidget.setObjectName("myroot");
            const rootLayout = new FlexLayout();
            centralWidget.setLayout(rootLayout);
            win.setGeometry(x * quality, y * quality, quality, quality);
            const view = new QWidget(win);
            const button = new QPushButton();
            button.setFixedSize(quality, quality);
            //button.setGeometry(0, 0, quality, quality)
            button.setText('');
            button.setObjectName("button");
            button.addEventListener("clicked", (e) => buttonPressed(x, y, e));
            win.addEventListener(WidgetEventTypes.Close, (e) => { windowClosed(x, y, e) });
            const status = {
                opened: false,
                flagged: false,
                mine: false,
                nearMines: 0,
                windowOpened: false
            }
            rootLayout.addWidget(button);

            win.setCentralWidget(centralWidget);
            win.setStyleSheet(
                `
                  #myroot {
                    background-color: #009688;
                    margin: 0px;
                    padding: 0px;
                  }
                  #button {
                    background-color: #009688;
                    font-size: ${quality}px;
                    font-weight: bold;
                    width: 100%;
                    margin: 0px;
                    padding: 0px;
                  }
                `
            );
            boards.push({ win, x, y, status, button });
        }
    }
    //windows.forEach(win => win.show());
    let ii = 0
    for (const board of boards) {
        const { win } = board;
        openWindow(board);
        await sleep(50);
        /* ii += 1;
        if (ii > 2) {
            break;
        } */
    }
})();

const init = (x = 0, y = 0) => {
    const mineBoards = [];
    const mineNum = Math.round((boards.length * minePercentage) / 100);
    if (boards.length < mineNum) throw new Error("Not enough boards!");
    while (mineBoards.length < mineNum) {
        const index = Math.floor(Math.random() * boards.length);
        if (!mineBoards.includes(index) && !comparePos(boards[index], { x, y })) mineBoards.push(index);
    }
    boards.filter((v, k) => mineBoards.includes(k)).forEach(board => board.status.mine = true);
}

const judge = () => {
    if (boards.every(board => board.status.mine === board.status.flagged)) {
        gameOver = true;
        const win = new QMainWindow();
        const centralWidget = new QWidget();
        centralWidget.setObjectName("myroot");
        const rootLayout = new FlexLayout();
        centralWidget.setLayout(rootLayout);

        win.setFixedSize(500, 100);
        win.setObjectName("myroot")
        const label = new QLabel();
        label.setObjectName("label")
        label.setText("YOU WIN!!!");
        rootLayout.addWidget(label);
        win.setCentralWidget(centralWidget);
        win.setStyleSheet(
            `
              #myroot {
                background-color: #DDDD00;
                margin: 0px;
                padding: 0px;
                text-align: center;
              }
              #label{
                font-size: 64px;
              }
            `
        );
        win.show();
    }

}


const buttonPressed = (x, y, e) => {
    const board = boards.find(board => comparePos(board, { x, y }));
    if (board.opened) return;
    if (jobRunning || gameOver) return;
    if (board.status.flagged) {
        board.button.setText("");
        board.status.flagged = false;
    } else {
        board.button.setText("F");
        board.status.flagged = true;
    }
    judge();
}

const windowClosed = async (x, y, e) => {
    const board = boards.find(board => comparePos(board, { x, y }));
    board.status.windowOpened = false;

    if (jobRunning) {
        return;
    };
    jobRunning = true;
    if (gameOver) {
        await sleep(100);
        openWindow(board);
        jobRunning = false;
        return;
    }
    if (board.status.flagged || board.status.opened) {
        await sleep(100);
        openWindow(board);
        jobRunning = false;
        return;
    }

    if (boards.every(board => !board.status.mine)) init(x, y);

    if (board.status.mine) {
        //Game over
        gameOver = true;
        board.button.setText("M");
        await sleep(100);
        openWindow(board);
        return;
    }

    sweepJob(board);
    await sleep(100);
    jobRunning = false;
}

const sweepJob = async (boardToJob) => {
    if (boardToJob.status.mine) return;
    if (boardToJob.status.opened) return;

    const allAnglesArray = allAngles(boardToJob);
    const nearPosNum = allAnglesArray.filter(board => board.status.mine).length;
    //await sleep(1000);
    boards = boards.map(board => comparePos(board, boardToJob) ? (board.status.opened = true, board) : board);
    if (nearPosNum <= 0) {
        //await sleep(50);
        closeWindow(boardToJob);
        allAnglesArray.forEach(board => sweepJob(board));
    } else {
        await sleep(50);
        openWindow(boardToJob);
        boardToJob.button.setText(nearPosNum);
    }
}

const allAngles = (boardToSearch) => {
    const results = [];
    for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
            if (x == 0 && y == 0) continue;

            const board = boards.find(board => comparePos(board, { x: (boardToSearch.x + x), y: (boardToSearch.y + y) }));
            if (board !== undefined) results.push(board);
        }
    }
    return results;
}

const comparePos = (p, p2) => {
    return p.x === p2.x && p.y === p2.y;
}

const openWindow = (board) => {
    if (board.status.windowOpened) return;
    board.status.windowOpened = true;
    board.win.show();
}

const closeWindow = (board) => {
    if (!board.status.windowOpened) return;
    board.status.windowOpened = false;
    board.win.close();
}
