import React, { useState, useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";
import { useHistory } from 'react-router-dom';
import { NavLink as Link } from "react-router-dom";

import { Carousel } from "../components/home/Carousel";
import { slides } from "../components/home/carouselData.json";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { logout } from "../actions/auth";

import ControlsOnline from "../components/chat/ControlsOnline";
import { chatSocket } from "../services/websocket.service";
import parseCommasToThousands from "../utils/parseCommasToThousands";
import cutDecimalPoints from "../utils/cutDecimalPoints";
import { getUserVipData } from "../services/api.service";

import Button from "@material-ui/core/Button";
import Box from "@material-ui/core/Box";
import Avatar from "@material-ui/core/Avatar";



// Custom Styles
const useStyles = makeStyles({
  root: {
    overflowX: "hidden",
    minHeight: "100%",
    margin: "0 auto",
    paddingTop: 50,
    color: "#fff",
    maxWidth: "1028px",
    fontFamily: "Rubik",
    overflowY: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gridGap: "4vw",
    marginBottom: "40px",
  },
  headerLeft: {
    display: "flex",
    flexDirection: "column",
    gridGap: "4px",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gridGap: "20px",
  },
  headerOnline: {
    display: "flex",
    alignItems: "center",
    gridGap: "14px",
    color: "#a4aaae",
    fontSize: "14px",
    marginLeft: "4px",
  },
  headerWelcome: {
    color: "#fff",
    fontSize: "22px",
  },
  buttons: {
    display: "flex",
    alignItems: "center",
    gridGap: "16px",
  },
  primary: {
    height: "40px",
    width: "fit-content",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    color: "#fff",
    padding: "0 20px",
    borderRadius: "5px",
    transform: "translateZ(0)",
    background: "repeating-linear-gradient(45deg,transparent,transparent 10px,rgba(0,0,0,.08) 0,rgba(0,0,0,.08) 20px)",
    transition: "all 0.1s ease-in-out",
    "&:hover": {
      filter: "brightness(110%)",
      transform: "scale(1.03)"
    }
  },
  buttonContentSpan: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    whiteSpace: "nowrap",
    position: "relative",
    userSelect: "none",
    gridGap: "8px",
  },
  seperator: {
    width: "1px",
    height: "40px",
    backgroundColor: "#242b33",
  },
  user: {
    display: "flex",
    alignItems: "center",
    gridGap: "16px",
    borderRadius: "5px",
    padding: "6px 8px",
    margin: "-6px -8px",
    color: "#5b6368",
    textDecoration: "none",
  },
  pfp: {
    // padding: "1rem 0rem 0rem 1.5rem",
    outline: "none",
    display: "flex",
    "& div": {
      outline: "none",
      height: "2.5rem",
      width: "2.5rem",
      borderRadius: "100%",
    },
  },
  avatar2: {
    outline: "none",
    "&:hover": {
      transition: "all 400ms",
      transform: "scale(1.06)",
      WebkitTransform: "scale(1.06)",
    },
  },
  price: {
    fontFamily: "Rubik",
    color: "#FFC440",
    fontWeight: 500,
    letterSpacing: ".1em",
    margin: "auto",
    position: "absolute",
    marginTop: "-1px",
  },
  seperator2: {
    width: "100%",
    height: "1px",
    backgroundColor: "#242b33",
    margin: "34px 0",
  },
  games: {
    margin: "34px 0"
  },
  title: {
    color: "#fff",
    fontSize: "18px",
    marginBottom: "16px",
  },
  content: {
    display: "grid",
    gridGap: "12px",
    gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))",
  },
  content2: {
    display: "grid",
    gridGap: "12px",
    gridTemplateColumns: "repeat(auto-fill, minmax(calc(33.33% - 1rem), 1fr))",
  },
  gameContainer: {
    width: "100%",
    height: "100%",
    aspectRatio: "245/298",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-end",
    textAlign: "center",
    position: "relative",
    backgroundColor: "#1e242b",
    borderRadius: "10px",
    padding: "4px",
    transition: ".2s",
    // border: "1px solid #333b42",
    userSelect: "none",
    overflow: "hidden",
    transition: "all 0.3s ease-in-out",
    "&:hover": {
      cursor: "pointer",
      transform: "translateY(-10px) scale(1.02)", 
    },
  },
  new: {
    backgroundColor: "#FFC440",
    borderRadius: "5px",
    color: "#fff",
    fontSize: "12px",
    fontWeight: 500,
    position: "absolute",
    padding: "4px 10px",
    top: "5px",
    right: "5px",
    textTransform: "uppercase",
    zIndex: 1
  },
  image: {
    width: "unset",
    height: "110%",
    position: "absolute",
    top: 0,
    zIndex: "0 !important",
  },
  name: {
    color: "#fff",
    fontSize: "22px",
    fontWeight: 500,
    textTransform: "uppercase",
    zIndex: 1
  },
  desc: {
    minHeight: "20px",
    color: "#FFC440",
    fontSize: "10px",
    letterSpacing: "2px",
    textTransform: "uppercase",
    zIndex: 1
  },
  featureContainer: {
    backgroundColor: "#12171D",
    borderRadius: "0.4rem",
    width: "100%",
    padding: "2.5em",
    border: "1px solid #161D26",
    overflow: "hidden",
  },
  top: {
    position: "relative"
  },
  shadow: {
    height: "100px",
    width: "100px",
    borderRadius: "50%",
    filter: "blur(55px)",
    position: "absolute",
    top: 0,
    left: 0,
    transform: "translate(-20px,-30px)",
    opacity: ".4",
    display: "block",
  },
  h5: {
    margin: "2em 0 1em",
    color: "#f2f2f2",
    fontSize: "19px",
    fontWeight: 400,
  },
  p5: {
    color: "#7e8895",
    fontWeight: 300,
    lineHeight: "22px",
    margin: 0
  },
  button: {
    marginTop: "2em",
    color: "#fff",
    padding: ".7em 1em",
    borderRadius: "10px",
    whiteSpace: "nowrap",
    cursor: "pointer",
    textDecoration: "none",
    border: "none",
    background: "none",
    backgroundColor: "rgba(0, 0, 0, 0)",
    fontFamily: "Rubik",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition: ".3s",
  },
  featuredTitle: {
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "Rubik",
    fontSize: "24px",
    fontWeight: 900,
    display: "grid",
    color: "#fff",
    width: "120px",
    background: "linear-gradient(255deg,#00ffc2 -25%,#00aa6d)",
    clipPath: "polygon(8px 0,calc(100% - 8px) 0,100% 25%,100% 75%,calc(100% - 8px) 100%,8px 100%,0 75%,0 25%)",
    margin: "2rem 0 1rem 0",
    "& :before": {
      content: "",
      width: "100%",
      height: "100%",
      position: "absolute",
      top: 0,
      left: 0,
      zIndex: -1,
    }
  },

});

const Home = ({ isAuthenticated, isLoading, user, logout }) => {
  const classes = useStyles();
  const history = useHistory();

  const [loading, setLoading] = useState(true);
  const [usersOnline, setUsersOnline] = useState("---");
  const [vipData, setVipData] = useState(null);
  const [vipDataColor, setVipDataColor] = useState(null);



  const gameList = [
    {
      name: "Battles",
      img: "https://cdn.discordapp.com/attachments/1155585047018094683/1155585524367642701/meh.png",
      new: false,
      hot: true,
      alt: "PVP",
    },
    {
      name: "Cases",
      img: "https://cdn.discordapp.com/attachments/1155585047018094683/1155948741170303119/MM2_BET_SOLO_CASE_OPENING_VECTOR.png",
      new: true,
      hot: false,
      alt: "House",
    },
    {
      name: "Crash",
      img: "https://cdn.discordapp.com/attachments/1155585047018094683/1155948627630497812/MM2_BET_CRASH_VECTOR.png",
      new: false,
      hot: false,
      alt: "House",
    },
    {
      name: "Roulette",
      img: "https://cdn.discordapp.com/attachments/1155558337837011046/1155965337553096765/MM2_BET_roulette_VECTOR.png?ex=6513401d&is=6511ee9d&hm=6835e55594d587ff0b2dd3ef6fe076c3a2112fe233f080c7ac62ceef01c69ed8&",
      new: false,
      hot: false,
      alt: "House",
    },
    {
      name: "Jackpot",
      img: "https://cdn.discordapp.com/attachments/1155558337837011046/1155961662965297264/MM2_BET_jackpot_VECTOR.png?ex=65133cb1&is=6511eb31&hm=5069d024af01aea95074d29b4e5a370c9b95fbca34c30083fbccec108a3685e4&",
      new: false,
      hot: false,
      alt: "PVP",
    },
    {
      name: "Coinflip",
      img: "https://cdn.discordapp.com/attachments/1155585047018094683/1155585053372469403/MM2_BET_COINFLIP_VECTOR.png",
      new: false,
      hot: false,
      alt: "PVP",
    },
  ]

  const featureList = [
    {
      name: "Daily Cases",
      description: "Open your free daily level cases!",
      btn: "Open",
      svg: <svg style={{transform: "scale(1.4)"}} width="31" height="30" viewBox="0 0 16 10" fill="#625FE6" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_1_180)"><path d="M10.5167 4.99293C10.1074 4.99293 9.73301 4.78886 9.52404 4.4705L7.99157 2.0869L6.45911 4.46234C6.25013 4.78069 5.86702 4.98477 5.46649 4.98477C5.35329 4.98477 5.24881 4.96844 5.14432 4.93579L1.87912 4.05419V8.0214C1.87912 8.34792 2.11421 8.63363 2.4538 8.7071L7.59975 9.90706C7.83484 9.95604 8.09606 9.95604 8.33116 9.90706L13.4771 8.69893C13.808 8.6173 14.0518 8.3316 14.0518 8.00508V4.0297L10.7866 4.89498C10.6821 4.91946 10.5689 4.93579 10.4644 4.93579L10.5167 4.99293ZM15.5755 2.48689L14.3478 0.184923C14.2695 0.0461524 14.1127 -0.0354776 13.9473 -0.0191516L7.99157 0.691029L10.1684 4.07868C10.2554 4.21745 10.4383 4.28275 10.6037 4.23377L15.3143 2.96851C15.5494 2.9032 15.6626 2.65015 15.5494 2.44607L15.5755 2.48689ZM1.64403 0.184923L0.416311 2.47873C0.303117 2.6828 0.416311 2.92769 0.651405 2.98483L5.362 4.24193C5.52744 4.28275 5.71029 4.21745 5.79736 4.07868L7.98287 0.682865L2.01844 -0.035478C1.853 -0.059967 1.69627 0.0216628 1.6179 0.160434L1.64403 0.184923Z"></path></g><defs><clipPath id="clip0_1_180"><rect width="16" height="10" fill="currentColor"></rect></clipPath></defs></svg>,
      color: "#625FE6",
    },
    {
      name: "Affiliates",
      description: "Earn value every time a friend you refer plays!",
      btn: "Invite a Friend",
      svg: <svg style={{transform: "scale(1.4)"}} width="31" height="30" viewBox="0 0 16 17" fill="#C81069" xmlns="http://www.w3.org/2000/svg" class="tr-c h-[20px] w-auto fill-current"><path d="M8.00005 1.58106C7.493 1.57982 7.00441 1.77121 6.63312 2.11651C6.26182 2.46182 6.03554 2.93526 6.00005 3.44106C5.11771 3.76653 4.32886 4.30381 3.70287 5.00566C3.07688 5.7075 2.63292 6.5524 2.41005 7.46606C2.39298 7.53111 2.3892 7.59893 2.39894 7.66546C2.40869 7.732 2.43176 7.79589 2.46677 7.85331C2.50178 7.91072 2.54801 7.96049 2.6027 7.99962C2.65739 8.03875 2.71941 8.06645 2.78505 8.08106C2.8232 8.08627 2.86189 8.08627 2.90005 8.08106C3.01494 8.08413 3.12739 8.04753 3.21846 7.97741C3.30953 7.90728 3.37365 7.80793 3.40005 7.69606C3.57729 6.97126 3.92331 6.29861 4.4099 5.73295C4.89649 5.16729 5.50988 4.72463 6.20005 4.44106C6.354 4.76429 6.59189 5.04027 6.8889 5.24019C7.1859 5.44011 7.53112 5.55664 7.88853 5.57762C8.24594 5.59859 8.60242 5.52325 8.92077 5.35944C9.23912 5.19563 9.50766 4.94937 9.69837 4.64637C9.88907 4.34336 9.99494 3.99472 10.0049 3.63684C10.0149 3.27896 9.92865 2.92496 9.75514 2.61179C9.58163 2.29862 9.32724 2.03777 9.01852 1.85647C8.7098 1.67516 8.35807 1.58005 8.00005 1.58106ZM8.00005 4.58106C7.80227 4.58106 7.60893 4.52241 7.44448 4.41253C7.28003 4.30265 7.15186 4.14647 7.07617 3.96375C7.00048 3.78102 6.98068 3.57995 7.01926 3.38597C7.05785 3.19199 7.15309 3.01381 7.29294 2.87396C7.43279 2.7341 7.61098 2.63886 7.80496 2.60028C7.99894 2.56169 8.20001 2.5815 8.38273 2.65718C8.56546 2.73287 8.72164 2.86104 8.83152 3.02549C8.9414 3.18994 9.00005 3.38328 9.00005 3.58106C9.00005 3.84628 8.89469 4.10063 8.70715 4.28817C8.51962 4.47571 8.26526 4.58106 8.00005 4.58106ZM13.745 8.73106C13.7343 7.79234 13.4912 6.87091 13.0375 6.04904C12.5838 5.22716 11.9336 4.53044 11.145 4.02106C11.09 3.98138 11.0274 3.95333 10.9611 3.93863C10.8948 3.92392 10.8262 3.92287 10.7595 3.93553C10.6928 3.94819 10.6294 3.9743 10.5731 4.01227C10.5169 4.05024 10.4689 4.09927 10.4322 4.15638C10.3955 4.21348 10.3708 4.27747 10.3596 4.34443C10.3484 4.41139 10.351 4.47993 10.3672 4.54586C10.3834 4.6118 10.4128 4.67375 10.4537 4.72794C10.4946 4.78213 10.5461 4.82742 10.605 4.86106C11.2317 5.26604 11.7524 5.81498 12.1238 6.46208C12.4952 7.10919 12.7065 7.83571 12.74 8.58106C12.2575 8.64198 11.8136 8.87669 11.4916 9.24124C11.1696 9.60579 10.9914 10.0752 10.9905 10.5616C10.9896 11.048 11.166 11.5181 11.4867 11.8838C11.8074 12.2496 12.2504 12.4859 12.7327 12.5486C13.2151 12.6113 13.7037 12.4961 14.1073 12.2245C14.5108 11.9529 14.8015 11.5436 14.925 11.0731C15.0485 10.6026 14.9963 10.1033 14.7782 9.6685C14.5601 9.23373 14.191 8.89335 13.74 8.71106L13.745 8.73106ZM13 11.5811C12.8023 11.5811 12.6089 11.5224 12.4445 11.4125C12.28 11.3026 12.1519 11.1465 12.0762 10.9637C12.0005 10.781 11.9807 10.58 12.0193 10.386C12.0578 10.192 12.1531 10.0138 12.2929 9.87395C12.4328 9.7341 12.611 9.63886 12.805 9.60028C12.9989 9.56169 13.2 9.58149 13.3827 9.65718C13.5655 9.73287 13.7216 9.86104 13.8315 10.0255C13.9414 10.1899 14 10.3833 14 10.5811C14 10.8463 13.8947 11.1006 13.7072 11.2882C13.5196 11.4757 13.2653 11.5811 13 11.5811ZM11.605 12.6711C11.5649 12.6186 11.5147 12.5746 11.4574 12.5416C11.4001 12.5086 11.3369 12.4874 11.2713 12.479C11.2058 12.4706 11.1392 12.4753 11.0755 12.4929C11.0117 12.5104 10.9521 12.5404 10.9 12.5811C10.0472 13.2539 8.98604 13.6076 7.90005 13.5811C7.23629 13.5736 6.58156 13.4264 5.97851 13.149C5.37545 12.8716 4.83762 12.4702 4.40005 11.9711C4.72166 11.6382 4.91785 11.204 4.95516 10.7426C4.99248 10.2813 4.8686 9.82125 4.60466 9.44099C4.34072 9.06074 3.95305 8.78381 3.50776 8.65743C3.06247 8.53104 2.58713 8.56302 2.16278 8.74792C1.73844 8.93281 1.39136 9.25917 1.18073 9.67135C0.970103 10.0835 0.908965 10.556 1.00774 11.0082C1.10652 11.4604 1.35909 11.8644 1.7224 12.1512C2.08571 12.438 2.53725 12.5899 3.00005 12.5811C3.19319 12.5809 3.38526 12.5523 3.57005 12.4961C4.09733 13.1369 4.75774 13.6553 5.50545 14.0154C6.25316 14.3754 7.07026 14.5684 7.90005 14.5811H8.00005C9.26764 14.5762 10.4981 14.1525 11.5 13.3761C11.5537 13.337 11.599 13.2877 11.6334 13.2309C11.6677 13.1742 11.6905 13.1112 11.7002 13.0456C11.71 12.9799 11.7066 12.913 11.6903 12.8487C11.6739 12.7844 11.645 12.724 11.605 12.6711ZM2.00005 10.5811C2.00005 10.3833 2.0587 10.1899 2.16858 10.0255C2.27846 9.86104 2.43464 9.73287 2.61736 9.65718C2.80009 9.58149 3.00116 9.56169 3.19514 9.60028C3.38912 9.63886 3.5673 9.7341 3.70715 9.87395C3.84701 10.0138 3.94225 10.192 3.98083 10.386C4.01942 10.58 3.99962 10.781 3.92393 10.9637C3.84824 11.1465 3.72007 11.3026 3.55562 11.4125C3.39117 11.5224 3.19783 11.5811 3.00005 11.5811C2.73483 11.5811 2.48048 11.4757 2.29294 11.2882C2.1054 11.1006 2.00005 10.8463 2.00005 10.5811Z"></path></svg>,
      color: "#C81069",
    },
    {
      name: "Race",
      description: "Join our weekly race just by wagering to get free rewards!",
      btn: "View the race",
      svg: <svg style={{transform: "scale(1.4)"}} aria-hidden="true" focusable="false" data-prefix="far" data-icon="receipt" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" class="svg-inline--fa fa-receipt fa-w-16 fa-fw"><path fill="#FFC440" d="M210.4 173.6c-50.8 0-86.1 10-114.4 22.1V102a56 56 0 1 0-64 0v388a22 22 0 0 0 22 22h20a22 22 0 0 0 22-22V298.7c28.3-12.1 63.6-22.1 114.4-22.1a144.77 144.77 0 0 1 29.6 3.26v-103a144.77 144.77 0 0 0-29.6-3.26zM240 374.82c39.58 8.25 77.24 29.4 128 31.38v-95c-50.76-2-88.42-23.13-128-31.38zM368 97.76a169.27 169.27 0 0 1-18.5 1c-37.32 0-70.17-16.92-109.5-27.17v105.23c39.58 8.25 77.24 29.4 128 31.38zm143.9 146.3v-84c-35.79 24.58-88.14 48.3-136.3 48.3-2.57 0-5.09-.07-7.6-.16v103c2.51.09 5 .16 7.6.16 48.2 0 100.6-23.76 136.4-48.36v-17.16c-.06-.57-.09-1.16-.1-1.78z" class="fa-primary"></path></svg>,
      color: "#FFC440",
    },
  ]

  const renderGames = () => {
    let r = [];
    for(let i = 0; i < gameList.length; i++) {
      r.push(
        <div className={classes.gameContainer} onClick={() => history.push("/" + gameList[i].name.toLowerCase())}>
          { gameList[i].new ? <div className={classes.new}>NEW</div> : "" }
          { gameList[i].hot ? <div className={classes.new} style={{background: "#EA2E32"}}>HOT</div> : "" }
          <img className={classes.image} src={gameList[i].img} />
          <div className={classes.name}>{gameList[i].name}</div>
          <div className={classes.desc}>{gameList[i].alt}</div>
        </div>
      )
    }
    return r;
  }

  const renderFeatures = () => {
    let r = [];
    for(let i = 0; i < featureList.length; i++) {
      r.push(
        <div className={classes.featureContainer} 
          style={{ 
            background: featureList[i].name.toLowerCase() == "daily cases" ? "repeating-linear-gradient(45deg,transparent,transparent 10px,rgba(0,0,0,.08) 0,rgba(0,0,0,.08) 20px)" : "",
            opacity: featureList[i].name.toLowerCase() == "daily cases" ? 0.5 : 1,
            pointerEvents: featureList[i].name.toLowerCase() == "daily cases" ? "none" : "all",
          }} 
          onClick={() => history.push("/" + featureList[i].name.toLowerCase())}>
          <div className={classes.top}>
            {featureList[i].svg}
            <span style={{ background: featureList[i].color }} className={classes.shadow}></span>
          </div>
          <h5 className={classes.h5}>{featureList[i].name}</h5>
          <p className={classes.p5}>{featureList[i].description}</p>
          <button className={classes.button} style={{ backgroundColor: featureList[i].color}}>{featureList[i].btn}</button>
        </div>
      )
    }
    return r;
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (isAuthenticated) {
          setLoading(true);
          const data = await getUserVipData();
          // Update state
          setVipData(data);
          const currentMajorLevel = data.majorLevelNames.find((levelName, index) => {
            const currentLevelIndex = data.allLevels.findIndex((level) => level.name === data.currentLevel.name);
            const nextIndex = data.allLevels.findIndex((level) => level.levelName === data.majorLevelNames[index + 1]);
            if (currentLevelIndex >= index && (nextIndex === -1 || currentLevelIndex < nextIndex)) {
              return true;
            }
            return false;
          });
          const currentMajorLevelIndex = data.majorLevelNames.indexOf(currentMajorLevel);
          setVipDataColor(data.majorLevelColors[currentMajorLevelIndex]);
        }
        setLoading(false);
      } catch (error) {
        console.log("There was an error while loading user vip data:", error);
      }
    };
    fetchData();

    chatSocket.on("users-online", updateUsersOnline);

    return () => {
      chatSocket.off("users-online", updateUsersOnline);
    };
  }, []);

  const updateUsersOnline = newCount => {
    setUsersOnline(newCount);
  };

  return (
    <div className={classes.root} >
      <div className={classes.header}>
        <div className={classes.headerLeft}>
          <div className={classes.headerOnline}>
            <ControlsOnline usersOnline={usersOnline} />
          </div>
          <div className={classes.headerWelcome}>{ isAuthenticated && user ? "Welcome Back!" : "Welcome!" }</div>
        </div>
        {isAuthenticated && user ? (
          <div className={classes.headerRight}>
          <div className={classes.buttons}>
            <div className={classes.primary} style={{backgroundColor: "#3d9d43"}} onClick={() => history.push("/deposit")}>
              <span className={classes.buttonContentSpan}>
                <span className={classes.buttonContentSpan}>
                  <svg data-v-8351ef5e="" data-v-98afd824="" fill="currentColor" width="24" height="24" viewBox="0 0 24 24" class="material-design-icon__svg"><path data-v-8351ef5e="" data-v-98afd824="" d="M2 12H4V17H20V12H22V17A2 2 0 0 1 20 19H4A2 2 0 0 1 2 17M11 5H13V8H16V10H13V13H11V10H8V8H11Z"><title data-v-8351ef5e="" data-v-98afd824="">Tray Plus icon</title></path></svg>
                </span>
                Deposit
              </span>
            </div>
            <div className={classes.primary} style={{backgroundColor: "#bb2f2a"}} onClick={() => history.push("/market")}>
              <span className={classes.buttonContentSpan}>
                <span className={classes.buttonContentSpan}>
                  <svg data-v-8351ef5e="" data-v-98afd824="" fill="currentColor" width="24" height="24" viewBox="0 0 24 24" class="material-design-icon__svg"><path data-v-8351ef5e="" data-v-98afd824="" d="M16 10H8V8H16M2 17A2 2 0 0 0 4 19H20A2 2 0 0 0 22 17V12H20V17H4V12H2Z"><title data-v-8351ef5e="" data-v-98afd824="">Tray Minus icon</title></path></svg>
                </span>
                Withdraw
              </span>
            </div>
          </div>
          <div className={classes.seperator} />
          <div className={classes.user}>
            <Box className={classes.pfp} style={{ marginRight: "90px" }}>
              <Box className={classes.avatar2}>
                <Link exact to="/profile" style={{ outline: "none", marginRight: "52px" }}>
                  <Avatar variant="rounded" src={user.avatar} style={{ border: `2px solid ${vipDataColor}`, }} />
                </Link>
              </Box>
              <Link
                style={{
                  textDecoration: "none",
                  marginLeft: "52px",
                  outline: "none",
                  position: "absolute",
                  color: "#fff",
                  marginTop: "4px",
                  fontSize: "13px",
                }}
                exact to="/profile"><span className="usernamenav">{user.username}</span>
                <Box className={classes.price}>
                  $
                  {parseCommasToThousands(
                    cutDecimalPoints(user.wallet.toFixed(7))
                  )}
                </Box>
              </Link>
            </Box>
          </div>
        </div>
        ) : " "}
      </div>
      <Carousel data={slides} />
      <div className={classes.seperator2} />
      <div className={classes.games}>
        <div className={classes.title}>Games</div>
        <div className={classes.content}>
          {renderGames()}
        </div>
      </div>
      <div className={classes.games}>
        <div className={classes.title}>Features</div>
        <div className={classes.content2}>
          {renderFeatures()}
        </div>
      </div>
    </div>
  );
};

Home.propTypes = {
  isAuthenticated: PropTypes.bool,
  isLoading: PropTypes.bool,
  user: PropTypes.object,
  logout: PropTypes.func.isRequired,
};

const mapStateToProps = state => ({
  isAuthenticated: state.auth.isAuthenticated,
  isLoading: state.auth.isLoading,
  user: state.auth.user,
});

export default connect(mapStateToProps, { logout })(Home);