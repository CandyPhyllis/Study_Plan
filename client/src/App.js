import './App.css';
import "react-bootstrap";
import 'bootstrap/dist/css/bootstrap.min.css';
import {useEffect, useState} from 'react';
import Layout from './Layout'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation} from 'react-router-dom';
import API from './API'
import {Courses} from './CourseList'
import {StudyPlan} from './StudyPlan'
import {LoginForm} from './Login'
import { ToastContainer,toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  return (
    <Router>
      <App2 />
    </Router>
  )
}

function App2() {
  const navigate = useNavigate();
  const location = useLocation();
  const [dirty, setDirty] = useState(false); //used for the "undo changes" button in StudyPlan
  const [initialLoading, setInitialLoading] = useState(true); //loading
  const [loggedIn, setLoggedIn] = useState(false); //the user is not initially lagged
  const [message, setMessage] = useState('');
  const [user, setUser] = useState({});
  const [courses, setCourses] = useState([]);
  const [studyPlan, setStudyPlan] = useState([])

  const handleStudyPlan = (study_plan) => {
    //let study_plan = [...studyPlan];
    study_plan = study_plan.sort((a,b) => (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0));
    setStudyPlan(study_plan)
  }

  const checkAuth = async() => {
    try {
      // here you have the user info, if already logged in
      // TODO: store them somewhere and use them, if needed
      const user = await API.getUserInfo();
      setLoggedIn(true);
      setUser(user);
    } catch(err) {
      console.log(err);
    }
  };

  useEffect(()=> {
      checkAuth();
  }, []);

  useEffect(() => {
      if(initialLoading && courses.length === 0){
        setInitialLoading(false)
        //setLoggedIn(true)
        API.getAllCourses()
        .then((c) => {
          setCourses(c)})
        .catch((err) => {handleError(err)});
    }
  }, [initialLoading])

  useEffect(() => {
    if(studyPlan.length === 0 && loggedIn && user.hasStudyPlan === 1) {
      API.getStudyPlan(user.username)
            .then((c) => {
              handleStudyPlan(c)
            })
            .catch((err) => {handleError(err)})
    }
  }, [loggedIn, user])

  function handleError(err) {
    console.log(err)
    setMessage(err)
  }

  /* HState-saved list handler, not API related */
  const addToStudyPlan = (course) => {
    let study_plan = [...studyPlan];
    
    if(study_plan.filter(sp => sp.id === course.id).length === 0 ){
      // Incompatible
      if(study_plan.filter(sp => sp.incompatibles.includes(course.id)).length === 0) {
        // Propaedeutic
        if((course.propedeuticity != null && study_plan.filter(sp => course.propedeuticity === sp.id).length > 0) || course.propedeuticity === null){
          study_plan.push(course)
          handleStudyPlan(study_plan)
          setDirty(true)
          }
        else
          handleError(`Error: to enter this course, you must first enter the one with the code ${course.propedeuticity}`)
      }
      else
        handleError("The course is incompatible with those entered")
    }
  }

  const removeFromStudyPlan = (course) => {
    let study_plan = [...studyPlan];
    if(study_plan.filter(sp => course.id === sp.propedeuticity).length > 0) {
      handleError("Error: you cannot remove this course as it has a propaedeutic nature in the study plan.")
      toast.error(
        "Error: you cannot remove this course as it has a propaedeutic nature in the study plan.",
        { position: "top-center" },
        { toastId: 1 }
      );
    }
    else {
      study_plan = study_plan.filter(sp => sp.id !== course.id);
      handleStudyPlan(study_plan)
      setDirty(true)
    }
  }

  const refreshStudyPlan = () => {
    API.getStudyPlan(user.username)
      .then((study_plan) => {
        handleStudyPlan(study_plan)
        setDirty(false)
        toast.success(
          "Changes canceled successfully",
          { position: "top-center" },
          { toastId: 1 }
        );
      })
  }

  /* 
    It has the task of updating the study plan by calling the respective API
  */
  const updateStudyPlan = (isFullTime) => {
    let credits = studyPlan.reduce((c1, c2) => {return c1 + c2.cfu;}, 0)

    if((isFullTime===1 && credits >= 60 && credits <= 80)
      || (isFullTime===0 && credits >= 20 && credits <= 40)){
        API.addToStudyPlan(user.username, isFullTime, studyPlan)
        .then(() =>{
          toast.success(
            `Study plan updated correctly`,
            { position: "top-center" },
            { toastId: 1 }
          );
        });
        setDirty(false)
        return true
    }
    else{
      toast.error(
        `Credit constraint not respected.`,
        { position: "top-center" },
        { toastId: 1 }
      );
      return false;
    }
  }

  const deleteSP = (student_id) => {
      API.deleteStudyPlan(student_id)
      .then(() =>{
        toast.success(
          `Study plan successfully deleted`,
          { position: "top-center" },
          { toastId: 1 }
        );
        setStudyPlan([])
        setDirty(false)
      })
      .catch(err => {
        toast.error(
          `Error in modifying the study plan`,
          { position: "top-center" },
          { toastId: 1 }
        );
      })
      checkAuth();
      navigate('/home')
  }

  const doLogIn = (credentials) => {
      API.logIn(credentials)
        .then( user =>{
        setLoggedIn(true);
        setUser(user);
        setInitialLoading(false);
        setDirty(false)
        API.getStudyPlan(user.username)
          .then((sp) => setStudyPlan(sp))
        //setShow(true);
        toast.success(
          `Welcome ${user.name}!`,
          { position: "top-center" },
          { toastId: 1 }
        );
        navigate('/home');
      })
      .catch(err => {
        toast.error(
          `Invalid username and/or password`,
          { position: "top-center" },
          { toastId: 1 }
        );
        handleError(err);
      })
  }

  const doLogOut = async () => {
      await API.logOut()
      .then(() => {
        toast.success(
          "Logged out successfully",
          { position: "top-center" },
          { toastId: 1 }
        );
      });
      setLoggedIn(false);
      setUser({});
      setStudyPlan([])
      navigate('/');
    }

  return (
    <>
    <Routes>
      <Route path='/' element = {<Layout loggedIn = {loggedIn} username={user.name} logout={doLogOut}/>}>
        <Route path='/' element = { loggedIn ? 
            <Navigate to='/home' />  
          : <Courses courses={courses}/> }/>
        <Route path='/login' element={loggedIn ? <Navigate to='/home' /> : <LoginForm login = {doLogIn} message = {message} />} />
        <Route path='/home' element={loggedIn ? (
          initialLoading ? 
            <Loading/> 
            : <SPLogged 
                courses={courses} 
                user={user} 
                studyPlan={studyPlan} 
                loggedIn={loggedIn} 
                addToStudyPlan={addToStudyPlan}
                removeFromStudyPlan={removeFromStudyPlan}
                updateStudyPlan={updateStudyPlan}
                refreshStudyPlan={refreshStudyPlan}
                deleteSP={deleteSP}
                dirty={dirty}/> 
          ) : <Navigate to='/'/>}/>
      </Route>
    </Routes>
    <ToastContainer limit={2} autoClose={2000}/>
    </>
  );
}

function SPLogged(props) {
  return(
    <>
    <StudyPlan 
      courses={props.studyPlan} 
      user={props.user} 
      removeFromStudyPlan={props.removeFromStudyPlan}
      refreshStudyPlan={props.refreshStudyPlan}
      updateStudyPlan={props.updateStudyPlan}
      deleteSP={props.deleteSP}
      dirty={props.dirty}
      />
         <br></br>
    <Courses 
      courses={props.courses}
      studyPlan={props.studyPlan}
      loggedIn={props.loggedIn} 
      user={props.user} 
      addToStudyPlan = {props.addToStudyPlan}/> 
    </>
  )
}

function Loading(props) {
  return (
    <h2>Loading data...</h2>
  )
}

export default App;
