 # Computing TSS from desired Form Percentage

FitT = FitY + [(TSS - FitY) / 42]
FatT = FatY + [(TSS - FatY) / 7]

FormT = FitT - FatT

FormT = FitY + [(TSS - FitY) / 42]  -  FatY + [(TSS - FatY) / 7]



FormT = FitY + (TSS - FitY)  -  FatY + (TSS - FatY)
               ------------            ------------
                    42                      7


        [FitT - FatT] 
FormP = -------------
             FitT


        [FitY + [(TSS - FitY) / 42]]    -    [FatY + [(TSS - FatY) / 7]]
FormP = ----------------------------------------------------------------
                           FitY + [(TSS - FitY) / 42]


(FitY + [(TSS - FitY) / 42]) * FormP  = [FitY + [(TSS - FitY) / 42]] - [FatY + [(TSS - FatY) / 7]]

(FormP)(FitY + [(TSS - FitY) / 42]) = [FitY + [(TSS - FitY) / 42]] - [FatY + [(TSS - FatY) / 7]]

(FormP - 1)(FitY + [(TSS - FitY) / 42]) = -[FatY + [(TSS - FatY) / 7]]

-(FormP - 1)(FitY + [(TSS - FitY) / 42]) = [FatY + [(TSS - FatY) / 7]]

-(FormP - 1)(FitY + [(TSS - FitY) / 42]) = FatY + (TSS - FatY)
                                                  ------------
                                                       7

-7(FormP - 1)(FitY + [(TSS - FitY) / 42]) = 7FatY + TSS - FatY

-7(FormP - 1)(FitY + [(TSS - FitY) / 42]) = 6FatY + TSS

(-7FormP + 7)(FitY + [(TSS - FitY) / 42]) = 6FatY + TSS


                                6FatY + TSS
(FitY + [(TSS - FitY) / 42]) =  -----------
                               (-7FormP + 7)

FitY + (TSS - FitY)     6FatY + TSS
       ------------  =  -----------
            42         (-7FormP + 7)

42FitY + (TSS - FitY)  =  252FatY + 42TSS
                          ---------------
                           (-7FormP + 7)

41FitY + TSS  =  252FatY + 42TSS
                 ---------------
                  (-7FormP + 7)

(-7FormP + 7)(41FitY) + (-7FormP + 7)TSS = 252FatY + 42TSS

(-7FormP + 7)TSS = 252FatY + 42TSS - (-7FormP + 7)(41FitY)

(-7FormP + 7)TSS - 42TSS = 252FatY - (-7FormP + 7)(41FitY)

-7FormP*TSS + 7TSS - 42TSS = 252FatY - (-7FormP + 7)(41FitY)

-7FormP*TSS - 35TSS = 252FatY - (-7FormP + 7)(41FitY)

FormP*TSS - 5TSS = -36FatY + (-7FormP + 7)(41FitY)
                             ---------------------
                                        7

FormP*TSS - 5TSS = -36FatY + (-FormP + 1)(41FitY)

TSS * (FormP - 5) = -36FatY + (-FormP + 1)(41FitY)

TSS = -36FatY + (-FormP + 1)(41FitY)
      ------------------------------
              (FormP - 5)

TSS = -36FatY + (41FitY)(1 - FormP)
      ------------------------------
              (FormP - 5)



      (sec x NP x IF)
TSS = ---------------  x 100
        (FTP x 3600) 


      (sec x NP x (NP/FTP))
TSS =  --------------------         x 100
           (FTP x 3600)         

      (sec x (NP^2/FTP))
TSS =  --------------------         x 100
           (FTP x 3600)         

          (sec*NP^2/FTP)
TSS =  --------------------         x 100
           (FTP x 3600)         


             (sec*NP^2)
TSS =  --------------------         x 100
           (FTP^2 x 3600)         


             hours*NP^2
TSS =  --------------------         x 100
                FTP^2


