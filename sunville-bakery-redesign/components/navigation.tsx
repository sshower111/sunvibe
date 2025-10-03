"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isAtTop, setIsAtTop] = useState(true)

  useEffect(() => {
    const handleScroll = () => {
      setIsAtTop(window.scrollY < 50)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isAtTop ? "bg-transparent" : "bg-background/95 backdrop-blur-md shadow-sm"
      }`}
    >
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all group-hover:scale-110 ${
                isAtTop ? "bg-white/20 backdrop-blur-sm" : "bg-accent"
              }`}
            >
              <span className={`font-serif text-xl font-bold ${isAtTop ? "text-white" : "text-primary"}`}>S</span>
            </div>
            <span className={`font-serif text-2xl font-bold ${isAtTop ? "text-white" : "text-primary"}`}>
              Sunville Bakery
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="#home"
              className={`transition-colors font-medium ${
                isAtTop ? "text-white hover:text-accent" : "text-foreground hover:text-accent"
              }`}
            >
              Home
            </Link>
            <Link
              href="#about"
              className={`transition-colors font-medium ${
                isAtTop ? "text-white hover:text-accent" : "text-foreground hover:text-accent"
              }`}
            >
              About
            </Link>
            <Link
              href="#menu"
              className={`transition-colors font-medium ${
                isAtTop ? "text-white hover:text-accent" : "text-foreground hover:text-accent"
              }`}
            >
              Menu
            </Link>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90">Order Now</Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className={`md:hidden ${isAtTop ? "text-white" : "text-foreground"}`}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border bg-background">
            <div className="flex flex-col gap-4">
              <Link
                href="#home"
                className="text-foreground hover:text-accent transition-colors font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                href="#about"
                className="text-foreground hover:text-accent transition-colors font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                About
              </Link>
              <Link
                href="#menu"
                className="text-foreground hover:text-accent transition-colors font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Menu
              </Link>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90 w-full">Order Now</Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
