export type PopupOptions = {
  DSA_Sheet: SheetCollection
  DailyQuestionGoal: number
  extensionEnabled: boolean
}

type SheetCollection = {
  selectedSheet: string
  sheets: {
    [key: string]: SheetOptions
  }
}

type SheetOptions = {
  sheetName: string
  sheetId: string
  sheetUrl: string
}
