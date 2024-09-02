function fetchData(query, jwlToken) {
    return fetch('https://01.kood.tech/api/graphql-engine/v1/graphql', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwlToken}`
        },
        body: JSON.stringify({ query })
    })
        .then(response => response.json())
        .then(data => {
            return data
        })
        .catch(error => console.log(error))

}

function login() {
    let name = document.getElementById('name').value
    let pass = document.getElementById('password').value
    let credentials = btoa(`${name}:${pass}`)

    return fetch('https://01.kood.tech/api/auth/signin', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${credentials}`
        },
    })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.log("caught error: ", data.error)
                console.log(data)
                invalidCredentials()
            } else {
                document.body.style.backdropFilter = "blur(5px)"
                loggedIn()
                queryGraph(data)
            }
        })
        .catch(error => {
            console.log(error)
            console.log("caught an error")
        })
}

async function queryGraph(jwlToken) {
    let query = `
   {
  downTransactions: transaction(where: { type: { _eq: "down" } }) {
    amount
  }
  upTransactions: transaction(where: { type: { _eq: "up" } }) {
    amount
  }
  exercises: transaction(
    where: { _and: [{ type: { _eq: "xp" } }, { path: { _niregex: "(piscine)" } }] }
    order_by: { createdAt: asc }
  ) {
    amount
    createdAt
    object {
      name
    }
  }
  xp: transaction_aggregate(where: { type: { _eq: "xp" }, eventId: { _eq: 148 } }) {
    aggregate {
      sum {
        amount
      }
    }
  }
  level: transaction(
    limit: 1
    order_by: { amount: desc }
    where: { type: { _eq: "level" }, eventId: { _eq: 148 } }
  ) {
    amount
  }
  username: transaction(limit: 1) {
    userLogin
  }
}
    `

    try {
        let graph = await fetchData(query, jwlToken)
        let downTransactions = graph.data.downTransactions
        let upTransactions = graph.data.upTransactions
        let exercises = graph.data.exercises
        let level = graph.data.level[0].amount
        let xp = graph.data.xp.aggregate.sum.amount
        let username = graph.data.username[0].userLogin
        let latestEx = graph.data.exercises[graph.data.exercises.length - 1]
        displayAudit(downTransactions, upTransactions)
        displayChart(exercises)
        displayLevel(level, xp)
        displayLatestEx(latestEx)
        addUsername(username)
    } catch (error) {
        console.log(error)
    }
}

function displayLatestEx(latestEx) {
    let div = document.createElement('div')
    div.style.width = "450px"
    div.style.textAlign = "center"
    div.style.verticalAlign = "middle"

    let nameDiv = document.createElement('div')
    nameDiv.style.color = "blue"
    nameDiv.innerHTML = latestEx.object.name
    div.appendChild(nameDiv)

    let xp = latestEx.amount
    if (xp > 1000000) {
        xp = `${Math.round(xp / 10000) / 100} MB`
    } else if (xp > 1000) {
        xp = `${Math.round(xp / 10) / 100} kB`
    }
    let xpDiv = document.createElement('div')
    xpDiv.innerHTML = xp
    xpDiv.style.fontSize = "15px"
    div.appendChild(xpDiv)

    let date = new Date(latestEx.createdAt)
    let options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }
    let formattedDate = date.toLocaleString('en-US', options).replace(',', ' at')

    let timeDiv = document.createElement('div')
    timeDiv.innerHTML = formattedDate
    timeDiv.style.fontSize = "15px"
    div.appendChild(timeDiv)


    let bigDiv = document.getElementById('latestEx')
    bigDiv.innerHTML = "latest exercise"
    bigDiv.style.fontSize = "30px"

    bigDiv.addEventListener("mouseenter", () => displayLatestInside(div))
    bigDiv.addEventListener("mouseleave", () => dontDisplayLatestInside(div))
}

function displayLatestInside(div) {
    if (!document.getElementById('latestEx').contains(div)) {
        document.getElementById('latestEx').innerHTML = ""
        document.getElementById('latestEx').appendChild(div)
    }
}

function dontDisplayLatestInside(div) {
    if (document.getElementById('latestEx').contains(div)) {
        document.getElementById('latestEx').innerHTML = "latest exercise"
    }
}

function displayLevel(level, xp) {

    if (xp > 1000000) {
        xp = `${Math.round(xp / 10000) / 100} MB`
    } else if (xp > 1000) {
        xp = `${Math.round(xp / 10) / 100} kB`
    }

    let div = document.createElement('div')
    div.style.width = '100px'
    div.style.height = '100px'
    div.style.textAlign = 'center'
    div.style.verticalAlign = 'middle'

    let lvl = document.createElement('div')
    lvl.innerHTML = 'level'
    div.appendChild(lvl)

    let levelDiv = document.createElement('b')
    levelDiv.innerHTML = level
    levelDiv.style.fontSize = '30px'
    levelDiv.style.color = "blue"
    div.appendChild(levelDiv)

    div.appendChild(document.createElement('br'))

    let xpDiv = document.createElement('div')
    xpDiv.innerHTML = `${xp} `
    xpDiv.style.fontSize = '15px'
    div.appendChild(xpDiv)

    let bigDiv = document.getElementById('level')
    bigDiv.innerHTML = "Level"
    bigDiv.style.fontSize = "30px"

    bigDiv.addEventListener("mouseenter", () => displayLevelInside(div))
    bigDiv.addEventListener("mouseleave", () => dontDisplayLevelInside(div))
}

function displayLevelInside(div) {
    if (!document.getElementById('level').contains(div)) {
        document.getElementById('level').innerHTML = ""
        document.getElementById('level').appendChild(div)
    }
}

function dontDisplayLevelInside(div) {
    if (document.getElementById('level').contains(div)) {
        document.getElementById('level').innerHTML = "Level"
    }
}

function displayChart(exercises) {

    let maxXp = 0
    let total = 0
    for (let i = 0; i < exercises.length; i++) {
        total += exercises[i].amount
        if (maxXp < exercises[i].amount) {
            maxXp = exercises[i].amount
        }
    }

    let div = document.createElement('div')
    div.classList.add('barChart')
    div.style.width = '350px'
    div.style.height = '150px'

    let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('xpBar')
    svg.style.height = '100%'
    svg.style.width = '100%'

    for (let i = 0; i < exercises.length; i++) {
        let name = exercises[i].object.name
        name = name.replace(" ", "-")

        let height = exercises[i].amount / maxXp * 150
        let width = 350 / (exercises.length + 3)

        let g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
        g.classList.add('bar')
        g.setAttribute('fill', 'blue')

        let rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
        rect.classList.add(name)
        rect.classList.add(exercises[i].amount)
        rect.setAttribute('width', width)
        rect.setAttribute('height', height)
        rect.setAttribute('x', i * (width + 3))
        rect.setAttribute('y', 150 - height)
        rect.setAttribute('rx', 3)
        rect.setAttribute('ry', 3)
        rect.addEventListener('mousemove', displayRectData)
        rect.addEventListener('mouseout', stopDisplayRectData)
        g.appendChild(rect)
        svg.appendChild(g)
    }

    div.appendChild(svg)

    let bigDiv = document.getElementById('chart')
    bigDiv.innerHTML = "Chart"
    bigDiv.style.fontSize = "30px"

    bigDiv.addEventListener("mouseenter", () => displayChartInside(div))
    bigDiv.addEventListener("mouseleave", () => dontDisplayChartInside(div))
}

function displayChartInside(div) {
    if (!document.getElementById('chart').contains(div)) {
        document.getElementById('chart').innerHTML = ""
        document.getElementById('chart').appendChild(div)
    }
}

function dontDisplayChartInside(div) {
    if (document.getElementById('chart').contains(div)) {
        document.getElementById('chart').innerHTML = "Chart"

    }
}

function displayRectData(e) {
    let text = this.classList[0]
    let text2 = this.classList[1]

    this.setAttribute('fill', 'rgb(80, 80, 253)')

    tooltip.classList.add('hovered')
    tooltip.innerHTML = `<div style="text-align:center;">${text}<br>${text2}xp</div>`;

    const tooltipWidth = tooltip.offsetWidth
    const tooltipHeight = tooltip.offsetHeight

    let left = e.pageX - tooltipWidth / 2
    let top = e.pageY - tooltipHeight - 10

    if (left < 0) {
        left = 0
    }
    if (left + tooltipWidth > window.innerWidth) {
        left = window.innerWidth - tooltipWidth
    }
    if (top < 0) {
        top = e.pageY + 0
    }

    tooltip.style.left = `${left}px`
    tooltip.style.top = `${top}px`
}

function stopDisplayRectData() {
    this.setAttribute('fill', 'blue')
    tooltip.classList.remove('hovered')
}

let receivedXp = 0
let doneXp = 0
function displayAudit(downTransactions, upTransactions) {

    let xpDown = 0
    for (let i = 0; i < downTransactions.length; i++) {
        xpDown += downTransactions[i].amount
    }
    receivedXp = (xpDown / 1000000).toFixed(2)

    xpUp = 0
    for (let i = 0; i < upTransactions.length; i++) {
        xpUp += upTransactions[i].amount
    }
    doneXp = (xpUp / 1000000).toFixed(2)

    addAudit(receivedXp, doneXp)
}

function addAudit(received, done) {

    received = parseFloat(received)
    done = parseFloat(done)

    let total = done + received

    let auditDone = done / total * 100
    let auditReceived = received / total * 100 - 5

    let div = document.createElement('div')
    div.style.width = '150px'
    div.style.height = '150px'

    let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.height = '100%'
    svg.style.width = '100%'
    svg.setAttribute('viewBox', '0 0 42 42')

    let circleReceived = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    circleReceived.classList.add("received")
    circleReceived.setAttribute('cx', 21)
    circleReceived.setAttribute('cy', 21)
    circleReceived.setAttribute('r', 15.91549430918954)
    circleReceived.setAttribute('fill', 'none')
    circleReceived.setAttribute('stroke', 'lightblue')
    circleReceived.setAttribute('stroke-width', '3')
    circleReceived.setAttribute('stroke-dasharray', `${auditReceived} ${auditDone}`)
    circleReceived.setAttribute('stroke-dashoffset', 22.5 + auditReceived)
    circleReceived.setAttribute('stroke-linecap', 'round')

    let animateInReceived = document.createElementNS("http://www.w3.org/2000/svg", 'animate');
    animateInReceived.setAttribute('attributeName', 'stroke-width');
    animateInReceived.setAttribute('from', '3');
    animateInReceived.setAttribute('to', '5');
    animateInReceived.setAttribute('begin', 'mouseover');
    animateInReceived.setAttribute('dur', '0.3s');
    animateInReceived.setAttribute('fill', 'freeze');

    const animateOutReceived = document.createElementNS("http://www.w3.org/2000/svg", 'animate');
    animateOutReceived.setAttribute('attributeName', 'stroke-width');
    animateOutReceived.setAttribute('from', '5');
    animateOutReceived.setAttribute('to', '3');
    animateOutReceived.setAttribute('begin', 'mouseout');
    animateOutReceived.setAttribute('dur', '0.3s');
    animateOutReceived.setAttribute('fill', 'freeze');

    circleReceived.appendChild(animateInReceived)
    circleReceived.appendChild(animateOutReceived)
    svg.appendChild(circleReceived)

    auditDone = done / total * 100 - 5
    auditReceived = received / total * 100 + 5

    let circleDone = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    circleDone.classList.add("done")
    circleDone.setAttribute('cx', 21)
    circleDone.setAttribute('cy', 21)
    circleDone.setAttribute('r', 15.91549430918954)
    circleDone.setAttribute('fill', 'none')
    circleDone.setAttribute('stroke', 'blue')
    circleDone.setAttribute('stroke-width', '3')
    circleDone.setAttribute('stroke-dasharray', `${auditDone} ${auditReceived}`)
    circleDone.setAttribute('stroke-dashoffset', 22.5)
    circleDone.setAttribute('stroke-linecap', 'round')

    let animateInDone = document.createElementNS("http://www.w3.org/2000/svg", 'animate');
    animateInDone.setAttribute('attributeName', 'stroke-width');
    animateInDone.setAttribute('from', '3');
    animateInDone.setAttribute('to', '5');
    animateInDone.setAttribute('begin', 'mouseover');
    animateInDone.setAttribute('dur', '0.3s');
    animateInDone.setAttribute('fill', 'freeze');

    const animateOutDone = document.createElementNS("http://www.w3.org/2000/svg", 'animate');
    animateOutDone.setAttribute('attributeName', 'stroke-width');
    animateOutDone.setAttribute('from', '5');
    animateOutDone.setAttribute('to', '3');
    animateOutDone.setAttribute('begin', 'mouseout');
    animateOutDone.setAttribute('dur', '0.3s');
    animateOutDone.setAttribute('fill', 'freeze');

    circleDone.appendChild(animateInDone)
    circleDone.appendChild(animateOutDone)
    svg.appendChild(circleDone)

    let circleInner = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    circleInner.classList.add("inner")
    circleInner.setAttribute('cx', 21)
    circleInner.setAttribute('cy', 21)
    circleInner.setAttribute('r', 7)
    circleInner.setAttribute('fill', 'blue')
    circleInner.setAttribute('stroke', 'black')
    circleInner.setAttribute('stroke-width', '3')

    const animateIn = document.createElementNS("http://www.w3.org/2000/svg", 'animate');
    animateIn.setAttribute('attributeName', 'r');
    animateIn.setAttribute('from', '7');
    animateIn.setAttribute('to', '9');
    animateIn.setAttribute('begin', 'mouseover');
    animateIn.setAttribute('dur', '0.3s');
    animateIn.setAttribute('fill', 'freeze');

    const animateWidthIn = document.createElementNS("http://www.w3.org/2000/svg", 'animate');

    animateWidthIn.setAttribute('attributeName', 'stroke-width');
    animateWidthIn.setAttribute('from', '3');
    animateWidthIn.setAttribute('to', '4');
    animateWidthIn.setAttribute('begin', 'mouseover');
    animateWidthIn.setAttribute('dur', '0.3s');
    animateWidthIn.setAttribute('fill', 'freeze');

    const animateOut = document.createElementNS("http://www.w3.org/2000/svg", 'animate');
    animateOut.setAttribute('attributeName', 'r');
    animateOut.setAttribute('from', '9');
    animateOut.setAttribute('to', '7');
    animateOut.setAttribute('begin', 'mouseout');
    animateOut.setAttribute('dur', '0.3s');
    animateOut.setAttribute('fill', 'freeze');

    const animateWidthOut = document.createElementNS("http://www.w3.org/2000/svg", 'animate');
    animateWidthOut.setAttribute('attributeName', 'stroke-width');
    animateWidthOut.setAttribute('from', '4');
    animateWidthOut.setAttribute('to', '3');
    animateWidthOut.setAttribute('begin', 'mouseout');
    animateWidthOut.setAttribute('dur', '0.3s');
    animateWidthOut.setAttribute('fill', 'freeze');

    circleInner.appendChild(animateIn);
    circleInner.appendChild(animateWidthIn);
    circleInner.appendChild(animateOut);
    circleInner.appendChild(animateWidthOut);

    svg.appendChild(circleInner)

    div.appendChild(svg)

    let auditText = document.createElement('span')
    auditText.innerHTML = "your audit ratio"
    auditText.classList.add('tooltip')
    circleInner.appendChild(auditText)

    tooltip = document.querySelector('.tooltip')

    circleInner.addEventListener("mousemove", innerTextFn)
    circleInner.addEventListener("mouseout", innerTextFnExit)

    circleDone.addEventListener("mousemove", doneTextFn)
    circleDone.addEventListener("mouseout", doneTextFnExit)

    circleReceived.addEventListener("mousemove", receivedTextFn)
    circleReceived.addEventListener("mouseout", receivedTextFnExit)

    let bigDiv = document.getElementById('audit')
    bigDiv.innerHTML = "Audit"
    bigDiv.style.fontSize = "30px"

    bigDiv.addEventListener("mouseenter", () => displayAuditInside(div))
    bigDiv.addEventListener("mouseleave", () => dontDisplayAuditInside(div))
}

function displayAuditInside(div) {
    if (!document.getElementById('audit').contains(div)) {
        document.getElementById('audit').innerHTML = ""
        document.getElementById('audit').appendChild(div)
    }
}

function dontDisplayAuditInside(div) {
    if (document.getElementById('audit').contains(div)) {
        document.getElementById('audit').innerHTML = "Audit"
    }
}

let tooltip

function receivedTextFn(e) {
    tooltip.classList.add('hovered')
    tooltip.innerHTML = `you have recieved ${receivedXp} MB of audits`
    const tooltipWidth = tooltip.offsetWidth
    const tooltipHeight = tooltip.offsetHeight

    let left = e.pageX - tooltipWidth / 2
    let top = e.pageY - tooltipHeight - 10

    if (left < 0) {
        left = 0
    }
    if (left + tooltipWidth > window.innerWidth) {
        left = window.innerWidth - tooltipWidth
    }
    if (top < 0) {
        top = e.pageY + 0
    }

    tooltip.style.left = `${left}px`
    tooltip.style.top = `${top}px`
}

function receivedTextFnExit(e) {
    tooltip.classList.remove("hovered")
}

function doneTextFn(e) {
    tooltip.classList.add('hovered')
    tooltip.innerHTML = `you have done ${doneXp} MB of audits`
    const tooltipWidth = tooltip.offsetWidth
    const tooltipHeight = tooltip.offsetHeight

    let left = e.pageX - tooltipWidth / 2
    let top = e.pageY - tooltipHeight - 10

    if (left < 0) {
        left = 0
    }
    if (left + tooltipWidth > window.innerWidth) {
        left = window.innerWidth - tooltipWidth
    }
    if (top < 0) {
        top = e.pageY + 0
    }

    tooltip.style.left = `${left}px`
    tooltip.style.top = `${top}px`
}

function doneTextFnExit() {
    tooltip.classList.remove('hovered')
}

function innerTextFn(e) {
    tooltip.classList.add('hovered')
    tooltip.innerHTML = `your audit ratio is ${Math.round(doneXp / receivedXp * 10) / 10}`
    const tooltipWidth = tooltip.offsetWidth
    const tooltipHeight = tooltip.offsetHeight

    let left = e.pageX - tooltipWidth / 2
    let top = e.pageY - tooltipHeight - 10

    if (left < 0) {
        left = 0
    }
    if (left + tooltipWidth > window.innerWidth) {
        left = window.innerWidth - tooltipWidth
    }
    if (top < 0) {
        top = e.pageY + 0
    }

    tooltip.style.left = `${left}px`
    tooltip.style.top = `${top}px`
}

function innerTextFnExit(e) {
    tooltip.classList.remove('hovered')
}

let graphQl

function loginForm() {
    graphQl = document.getElementById('graphQl')
    document.getElementById('page').removeChild(graphQl)

    const loginDiv = `
            <div class="login">
                <h1>Login</h1>
                <div style="height: 40px; margin: 30px;">
                    <input type="text" name="username" id="name" placeholder="name/email">
                </div>
                <div style="height: 40px; margin: 30px;">
                    <input type="password" name="password" id="password" placeholder="password">
                </div>
                <button onclick="login()">login</button>
            </div>
        `;
    document.getElementById('login-container').innerHTML = loginDiv
}

function invalidCredentials() {
    let loginContainer = document.getElementById("login-container")
    let loginDiv = loginContainer.querySelector('.login')

    let message = document.createElement('p')
    message.innerHTML = "Invalid username or password"
    message.classList.add('message')

    if (!loginDiv.querySelector('.message')) {

        loginDiv.appendChild(message)
        loginContainer.appendChild(loginDiv)
    }
}


function loggedIn() {
    let loginContainer = document.body.querySelector('#login-container')
    let loginDiv = loginContainer.querySelector('.login')
    loginContainer.removeChild(loginDiv)

    let navbar = document.querySelector('.navbar')
    let loginButton = document.querySelector('.loginButton')
    navbar.removeChild(loginButton)

    let logoutButton = document.createElement('button')
    logoutButton.innerHTML = 'logout'
    logoutButton.classList.add('logoutButton')
    logoutButton.onclick = logout
    navbar.appendChild(logoutButton)

    document.getElementById('level').style.border = "2px solid rgba(129, 51, 255, 0.637)"
    document.getElementById('level').style.borderRadius = "10px"
    document.getElementById('chart').style.border = "2px solid rgba(129, 51, 255, 0.637)"
    document.getElementById('chart').style.borderRadius = "10px"
    document.getElementById('audit').style.border = "2px solid rgba(129, 51, 255, 0.637)"
    document.getElementById('audit').style.borderRadius = "10px"
    document.getElementById('latestEx').style.border = "2px solid rgba(129, 51, 255, 0.637)"
    document.getElementById('latestEx').style.borderRadius = "10px"
}

function logout() {
    document.getElementById('level').innerHTML = ""
    document.getElementById('chart').innerHTML = ""
    document.getElementById('audit').innerHTML = ""
    document.getElementById('latestEx').innerHTML = ""
    removeAllEventListeners();
    document.body.style.backdropFilter = ""

    let navbar = document.querySelector('.navbar')
    navbar.innerHTML = ""
    let loginButton = document.createElement('button')
    loginButton.innerHTML = "login"
    loginButton.onclick = loginForm
    loginButton.classList.add('loginButton')
    navbar.appendChild(loginButton)
    document.getElementById('level').style.border = ""
    document.getElementById('level').style.borderRadius = ""
    document.getElementById('chart').style.border = ""
    document.getElementById('chart').style.borderRadius = ""
    document.getElementById('audit').style.border = ""
    document.getElementById('audit').style.borderRadius = ""
    document.getElementById('latestEx').style.border = ""
    document.getElementById('latestEx').style.borderRadius = ""

    let page = document.getElementById('page')
    page.insertBefore(graphQl, page.firstChild)
    receivedXp = 0
    doneXp = 0
    tooltip = ""
}

function addUsername(username) {
    let user = document.createElement('p')
    user.innerHTML = username
    user.classList.add('username')
    let navbar = document.querySelector('.navbar')
    navbar.insertBefore(user, navbar.firstChild)
}

function removeAllEventListeners() {
    const elements = document.querySelectorAll('*')

    elements.forEach(element => {
        const clone = element.cloneNode(true)
        element.parentNode.replaceChild(clone, element)
    })
}
